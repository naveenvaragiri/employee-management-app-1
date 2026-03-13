# Real-Time Chat Feature — Technical Design Document

## 1. Overview

This document describes the design for a real-time, end-to-end encrypted group chat feature integrated into the Employee Management Application.

### Requirements

| Requirement | Approach |
|---|---|
| WebSocket-based communication | Native `ws` library on the Node.js server; browser `WebSocket` API on the client |
| Message persistence | PostgreSQL via `pg` connection pool |
| 10,000 concurrent users | Stateless connection index + Redis Pub/Sub for horizontal scaling |
| End-to-end encryption | X25519 Diffie-Hellman key exchange + XSalsa20-Poly1305 AEAD via TweetNaCl |

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              Browser clients                             │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  React <Chat> component                                            │  │
│  │  • Generates ephemeral X25519 key pair on mount                    │  │
│  │  • Encrypts outgoing messages with sender's own key pair           │  │
│  │  • Decrypts received messages using sender's public key            │  │
│  └───────────────────────────┬────────────────────────────────────────┘  │
│                              │  ws://host:5000/ws/chat                   │
└──────────────────────────────┼───────────────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────────────┐
│                         Node.js / Express                                │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │  HTTP routes (/api/chat/*)                                       │    │
│  │  • GET  /rooms                                                   │    │
│  │  • POST /rooms                                                   │    │
│  │  • GET  /rooms/:id/messages                                      │    │
│  │  • GET  /rooms/:id/members                                       │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │  WebSocket server (ws@8, path: /ws/chat)                         │    │
│  │  • perMessageDeflate: false  (reduces CPU at high concurrency)   │    │
│  │  • maxPayload: 64 KiB                                            │    │
│  │  • In-process room→Set<WebSocket> index for O(1) broadcast       │    │
│  │  • Redis Pub/Sub adapter for multi-node deployments (see §5)     │    │
│  └────────────────┬─────────────────────────────────────────────────┘    │
└───────────────────┼──────────────────────────────────────────────────────┘
                    │
┌───────────────────▼──────────────────────────────────────────────────────┐
│                           PostgreSQL                                     │
│  chat_rooms  ·  chat_room_members  ·  chat_messages                     │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. WebSocket Message Protocol

All frames are JSON-encoded strings.

### 3.1 Client → Server

#### `join`
Register the connecting user in a room and receive history.

```json
{
  "type":      "join",
  "roomId":    "<uuid or string>",
  "userId":    "<string>",
  "publicKey": "<base64-encoded X25519 public key>"
}
```

#### `message`
Send an encrypted message to a room.

```json
{
  "type":             "message",
  "roomId":           "<uuid>",
  "userId":           "<string>",
  "encryptedPayload": "{\"ciphertext\":\"<base64>\",\"nonce\":\"<base64>\"}"
}
```

### 3.2 Server → Client

#### `joined`
Sent immediately after a successful `join`.

```json
{
  "type":    "joined",
  "roomId":  "<uuid>",
  "members": [{"user_id": "alice", "public_key": "<base64>"}],
  "history": [{ "id": "...", "sender_id": "...", "encrypted_payload": "...", "created_at": "..." }]
}
```

#### `member_joined`
Broadcast to existing room members when a new user joins.

```json
{
  "type":      "member_joined",
  "roomId":    "<uuid>",
  "userId":    "<string>",
  "publicKey": "<base64>"
}
```

#### `message`
Broadcast to all room members when a message is saved.

```json
{
  "type":             "message",
  "id":               "<uuid>",
  "roomId":           "<uuid>",
  "senderId":         "<string>",
  "encryptedPayload": "<string>",
  "createdAt":        "<ISO8601>"
}
```

#### `error`
Sent when a protocol violation is detected.

```json
{ "type": "error", "message": "<human-readable description>" }
```

---

## 4. End-to-End Encryption

### 4.1 Key Generation
Each client generates an ephemeral **X25519** key pair on mount using TweetNaCl:

```js
const keyPair = nacl.box.keyPair();
// keyPair.publicKey — Uint8Array(32), shared with the server/room
// keyPair.secretKey — Uint8Array(32), never leaves the browser
```

### 4.2 Encryption (sender)
Messages are encrypted using `nacl.box` (X25519 + XSalsa20-Poly1305 AEAD):

```js
const nonce      = nacl.randomBytes(nacl.box.nonceLength); // 24 bytes
const ciphertext = nacl.box(plaintext, nonce, recipientPublicKey, senderSecretKey);
```

The `encryptedPayload` sent over the wire is:

```json
{ "ciphertext": "<base64>", "nonce": "<base64>" }
```

**The server never handles plaintext.** It stores and forwards only the encrypted payload.

### 4.3 Decryption (recipient)
```js
const plaintext = nacl.box.open(ciphertext, nonce, senderPublicKey, recipientSecretKey);
```

### 4.4 Key Distribution
- On `join`, each client registers its public key with the server (`chat_room_members.public_key`).
- On `joined`, the server returns the full member list with public keys so the joining client can decrypt historical messages from all known senders.
- On `member_joined`, each existing client learns the newcomer's public key immediately.

### 4.5 Security Considerations
| Concern | Mitigation |
|---|---|
| Key authenticity | Production deployment should bind public keys to authenticated user sessions (JWT/OAuth) |
| Forward secrecy | Ephemeral key pairs are regenerated on every page load; persisted history becomes undecryptable when the key is discarded |
| Server compromise | Server stores only ciphertext; an attacker with DB access cannot read message content |
| Replay attacks | Each message carries a unique random nonce (24 bytes); probability of nonce reuse is negligible |

---

## 5. Scalability: 10,000 Concurrent Users

### 5.1 Single-Node Capacity
Node.js with `ws` can handle tens of thousands of idle WebSocket connections in a single process using ~20–30 KB RAM per connection, well within a 16 GB instance's capacity.

Key tuning decisions:
- `perMessageDeflate: false` — eliminates per-connection zlib context allocation (~300 KB each), reducing memory by ~3 GB for 10 k connections.
- `maxPayload: 64 KiB` — prevents memory exhaustion from large frames.
- O(1) room broadcast via `roomId → Set<WebSocket>` index.
- PostgreSQL pool `max: 20` — amortises DB connections; queries are queued rather than opening a new connection per message.

### 5.2 Multi-Node Horizontal Scaling

For deployments requiring more than one server process, replace the in-process room map with a **Redis Pub/Sub** adapter:

```
Node A ──publish("room:abc", frame)──► Redis ──subscribe──► Node B, Node C
```

Each node subscribes to rooms that have at least one local WebSocket connection. When a message arrives, the node publishes it to Redis; all nodes (including the sender's node) deliver it to their local room members.

Recommended implementation: [`@socket.io/redis-adapter`](https://socket.io/docs/v4/redis-adapter/) or a custom Redis subscriber using `ioredis`.

### 5.3 Database Connection Scaling

At 10 k concurrent users, direct per-connection DB access is infeasible. Use **PgBouncer** (transaction-mode pooling) in front of PostgreSQL to multiplex hundreds of application pool connections into a smaller set of real server connections.

### 5.4 Capacity Estimate

| Resource | Value |
|---|---|
| WebSocket connections | 10,000 |
| RAM per idle connection (no deflate) | ~25 KB |
| Total RAM for connections | ~250 MB |
| Expected DB queries/s (1 msg/user/min) | ~167 |
| PgBouncer pool size recommendation | 20–50 |

---

## 6. Database Schema

See [`backend/chat/schema.sql`](../backend/chat/schema.sql) for the full DDL.

### Tables

**`chat_rooms`**
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | `gen_random_uuid()` |
| name | TEXT | Room display name |
| created_at | TIMESTAMPTZ | Auto-set on insert |

**`chat_room_members`**
| Column | Type | Notes |
|---|---|---|
| room_id | UUID FK | References `chat_rooms` |
| user_id | TEXT | Employee identifier |
| public_key | TEXT | Base64 X25519 public key |
| joined_at | TIMESTAMPTZ | Auto-set |

**`chat_messages`**
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | `gen_random_uuid()` |
| room_id | UUID FK | References `chat_rooms` |
| sender_id | TEXT | Employee identifier |
| encrypted_payload | TEXT | JSON `{ciphertext, nonce}` in base64 |
| created_at | TIMESTAMPTZ | Indexed (DESC) for efficient pagination |

---

## 7. REST API Endpoints

Base path: `/api/chat`

| Method | Path | Description |
|---|---|---|
| `GET` | `/rooms` | List all chat rooms |
| `POST` | `/rooms` | Create a new room (`{ name }`) |
| `GET` | `/rooms/:roomId/messages?limit=50` | Fetch recent messages (max 200) |
| `GET` | `/rooms/:roomId/members` | List room members and their public keys |

---

## 8. File Layout

```
backend/
├── chat/
│   ├── schema.sql          PostgreSQL DDL migration
│   ├── chatDatabase.js     pg pool + CRUD helpers
│   ├── chatServer.js       ws WebSocket server
│   └── chatServer.test.js  Jest unit tests
├── routes/
│   └── chat.js             Express REST routes
└── server.js               Mounts HTTP + WebSocket servers

frontend/src/components/
├── Chat.js                 React chat panel
├── Chat.css                Component styles
└── Chat.test.js            React Testing Library tests
```

---

## 9. Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PGHOST` | `localhost` | PostgreSQL host |
| `PGPORT` | `5432` | PostgreSQL port |
| `PGDATABASE` | `employee_mgmt` | Database name |
| `PGUSER` | `postgres` | Database user |
| `PGPASSWORD` | *(empty)* | Database password |
| `PORT` | `5000` | HTTP/WebSocket server port |

---

## 10. Deployment Checklist

- [ ] Run `psql -f backend/chat/schema.sql` against the target database.
- [ ] Set `PG*` environment variables for the server process.
- [ ] Provision PgBouncer if expecting > 1,000 concurrent message-sending users.
- [ ] Add Redis and configure Pub/Sub adapter for multi-node deployments.
- [ ] Enable TLS on the reverse proxy (Nginx/ALB) to ensure WebSocket traffic uses `wss://`.
- [ ] Bind public key registration to authenticated user identity (JWT claim or session).
