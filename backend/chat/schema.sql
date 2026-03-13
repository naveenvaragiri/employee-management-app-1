-- Real-time chat schema for PostgreSQL
-- Run this migration before starting the chat service.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Rooms represent named chat channels (e.g. department channels, DMs).
CREATE TABLE IF NOT EXISTS chat_rooms (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One record per participant in a room, storing their X25519 public key
-- so recipients can perform an E2E Diffie-Hellman key exchange.
CREATE TABLE IF NOT EXISTS chat_room_members (
  room_id     UUID        NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id     TEXT        NOT NULL,
  public_key  TEXT        NOT NULL,  -- base64-encoded X25519 public key
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

-- Persisted messages.  The payload is stored as received from the sender
-- (ciphertext + nonce encoded as base64-JSON).  The server never holds
-- plaintext.
CREATE TABLE IF NOT EXISTS chat_messages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      UUID        NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id    TEXT        NOT NULL,
  -- encrypted_payload is a JSON string: { ciphertext: "<base64>", nonce: "<base64>" }
  encrypted_payload TEXT  NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created
  ON chat_messages(room_id, created_at DESC);
