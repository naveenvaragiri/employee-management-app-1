/**
 * WebSocket chat server.
 *
 * Protocol (JSON frames over ws://):
 *
 *   Client → Server
 *   ───────────────
 *   { type: "join",    roomId, userId, publicKey }
 *       Register the user in a room and receive room history + member list.
 *
 *   { type: "message", roomId, userId, encryptedPayload }
 *       Send an encrypted message to a room.
 *       encryptedPayload = JSON string: { ciphertext: "<base64>", nonce: "<base64>" }
 *
 *   Server → Client
 *   ───────────────
 *   { type: "joined",  roomId, members: [{userId, publicKey}], history: [{...}] }
 *   { type: "member_joined", roomId, userId, publicKey }
 *   { type: "message", roomId, senderId, encryptedPayload, id, createdAt }
 *   { type: "error",   message }
 *
 * Scaling to 10 000 concurrent users:
 *   - The ws `perMessageDeflate` option is disabled to reduce per-connection
 *     CPU overhead at high concurrency.
 *   - A room→Set<WebSocket> index enables O(1) broadcast per room without
 *     scanning all connections.
 *   - For multi-instance deployments, replace the in-process room map with a
 *     Redis Pub/Sub adapter (see docs/chat-technical-design.md).
 */

const WebSocket = require('ws');
const chatDb = require('./chatDatabase');

// roomId → Set<WebSocket>
const roomConnections = new Map();

// ws → { userId, roomId }
const connectionMeta = new WeakMap();

function send(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastToRoom(roomId, payload, excludeWs = null) {
  const connections = roomConnections.get(roomId);
  if (!connections) return;
  const frame = JSON.stringify(payload);
  for (const client of connections) {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(frame);
    }
  }
}

async function handleJoin(ws, { roomId, userId, publicKey }) {
  if (!roomId || !userId || !publicKey) {
    send(ws, { type: 'error', message: 'join requires roomId, userId, publicKey' });
    return;
  }

  // Persist public key so offline recipients can look it up.
  await chatDb.upsertMember(roomId, userId, publicKey);

  // Register connection in room index.
  if (!roomConnections.has(roomId)) {
    roomConnections.set(roomId, new Set());
  }
  roomConnections.get(roomId).add(ws);
  connectionMeta.set(ws, { userId, roomId });

  // Send existing members + recent history to the joining client.
  const [members, history] = await Promise.all([
    chatDb.getRoomMembers(roomId),
    chatDb.getMessages(roomId, 50),
  ]);
  send(ws, { type: 'joined', roomId, members, history });

  // Notify existing room members of the new arrival.
  broadcastToRoom(roomId, { type: 'member_joined', roomId, userId, publicKey }, ws);
}

async function handleMessage(ws, { roomId, userId, encryptedPayload }) {
  if (!roomId || !userId || !encryptedPayload) {
    send(ws, { type: 'error', message: 'message requires roomId, userId, encryptedPayload' });
    return;
  }

  const saved = await chatDb.saveMessage(roomId, userId, encryptedPayload);

  const outbound = {
    type:             'message',
    id:               saved.id,
    roomId:           saved.room_id,
    senderId:         saved.sender_id,
    encryptedPayload: saved.encrypted_payload,
    createdAt:        saved.created_at,
  };

  // Deliver to all room members including sender (for multi-tab support).
  broadcastToRoom(roomId, outbound);
}

function handleClose(ws) {
  const meta = connectionMeta.get(ws);
  if (!meta) return;
  const { roomId } = meta;
  const connections = roomConnections.get(roomId);
  if (connections) {
    connections.delete(ws);
    if (connections.size === 0) {
      roomConnections.delete(roomId);
    }
  }
  connectionMeta.delete(ws);
}

/**
 * Attach the WebSocket chat server to an existing HTTP server instance.
 *
 * @param {import('http').Server} httpServer
 * @returns {WebSocket.Server}
 */
function createChatServer(httpServer) {
  const wss = new WebSocket.Server({
    server: httpServer,
    path: '/ws/chat',
    // Disable per-message deflate to reduce CPU overhead at high concurrency.
    perMessageDeflate: false,
    // Limit incoming message size to 64 KiB (encrypted payload headroom).
    maxPayload: 64 * 1024,
  });

  wss.on('connection', (ws) => {
    ws.on('message', async (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        send(ws, { type: 'error', message: 'Invalid JSON' });
        return;
      }

      try {
        if (msg.type === 'join') {
          await handleJoin(ws, msg);
        } else if (msg.type === 'message') {
          await handleMessage(ws, msg);
        } else {
          send(ws, { type: 'error', message: `Unknown message type: ${msg.type}` });
        }
      } catch (err) {
        console.error('Chat handler error:', err.message);
        send(ws, { type: 'error', message: 'Internal server error' });
      }
    });

    ws.on('close', () => handleClose(ws));

    ws.on('error', (err) => {
      console.error('WebSocket error:', err.message);
      handleClose(ws);
    });
  });

  return wss;
}

module.exports = { createChatServer, roomConnections };
