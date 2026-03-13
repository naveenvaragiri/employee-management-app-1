/**
 * PostgreSQL connection pool for the chat service.
 *
 * Reads connection configuration from environment variables:
 *   PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD
 *
 * Pool sizing is tuned for high concurrency (10,000 WebSocket connections):
 *   - max: 20 keeps the number of DB connections reasonable while still
 *     supporting burst query traffic through connection queuing.
 *   - idleTimeoutMillis / connectionTimeoutMillis provide fast failure
 *     detection so unhealthy connections are recycled quickly.
 */

const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.PGHOST     || 'localhost',
  port:     parseInt(process.env.PGPORT || '5432', 10),
  database: process.env.PGDATABASE || 'employee_mgmt',
  user:     process.env.PGUSER     || 'postgres',
  password: process.env.PGPASSWORD || '',
  max:                  20,
  idleTimeoutMillis:    30000,
  connectionTimeoutMillis: 3000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

// ─── Rooms ───────────────────────────────────────────────────────────────────

async function createRoom(name) {
  const { rows } = await pool.query(
    'INSERT INTO chat_rooms (name) VALUES ($1) RETURNING *',
    [name],
  );
  return rows[0];
}

async function getRoom(roomId) {
  const { rows } = await pool.query(
    'SELECT * FROM chat_rooms WHERE id = $1',
    [roomId],
  );
  return rows[0] || null;
}

async function listRooms() {
  const { rows } = await pool.query(
    'SELECT * FROM chat_rooms ORDER BY name',
  );
  return rows;
}

// ─── Members ─────────────────────────────────────────────────────────────────

async function upsertMember(roomId, userId, publicKey) {
  const { rows } = await pool.query(
    `INSERT INTO chat_room_members (room_id, user_id, public_key)
     VALUES ($1, $2, $3)
     ON CONFLICT (room_id, user_id) DO UPDATE SET public_key = EXCLUDED.public_key
     RETURNING *`,
    [roomId, userId, publicKey],
  );
  return rows[0];
}

async function getRoomMembers(roomId) {
  const { rows } = await pool.query(
    'SELECT user_id, public_key FROM chat_room_members WHERE room_id = $1',
    [roomId],
  );
  return rows;
}

// ─── Messages ────────────────────────────────────────────────────────────────

/**
 * Persist an encrypted message.
 * @param {string} roomId
 * @param {string} senderId
 * @param {string} encryptedPayload  JSON string: { ciphertext, nonce }
 */
async function saveMessage(roomId, senderId, encryptedPayload) {
  const { rows } = await pool.query(
    `INSERT INTO chat_messages (room_id, sender_id, encrypted_payload)
     VALUES ($1, $2, $3)
     RETURNING id, room_id, sender_id, encrypted_payload, created_at`,
    [roomId, senderId, encryptedPayload],
  );
  return rows[0];
}

/**
 * Return the last `limit` messages for a room (oldest first).
 */
async function getMessages(roomId, limit = 50) {
  const { rows } = await pool.query(
    `SELECT id, room_id, sender_id, encrypted_payload, created_at
     FROM chat_messages
     WHERE room_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [roomId, limit],
  );
  return rows.reverse();
}

module.exports = {
  pool,
  createRoom,
  getRoom,
  listRooms,
  upsertMember,
  getRoomMembers,
  saveMessage,
  getMessages,
};
