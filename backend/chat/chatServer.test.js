/**
 * Unit tests for the WebSocket chat server logic.
 *
 * The chatDatabase module is mocked to avoid requiring a real PostgreSQL
 * connection.  Tests verify the full WebSocket message protocol end-to-end.
 */

const http = require('http');
const WebSocket = require('ws');

// ─── Mock chatDatabase ───────────────────────────────────────────────────────

const mockMembers = [];
const mockHistory = [];

jest.mock('./chatDatabase', () => ({
  upsertMember: jest.fn(async (roomId, userId, publicKey) => {
    mockMembers.push({ user_id: userId, public_key: publicKey });
    return { room_id: roomId, user_id: userId, public_key: publicKey };
  }),
  getRoomMembers: jest.fn(async () => [...mockMembers]),
  getMessages:    jest.fn(async () => [...mockHistory]),
  saveMessage:    jest.fn(async (roomId, senderId, encryptedPayload) => ({
    id:               'msg-1',
    room_id:          roomId,
    sender_id:        senderId,
    encrypted_payload: encryptedPayload,
    created_at:       new Date().toISOString(),
  })),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const { createChatServer } = require('./chatServer');

function startServer() {
  const server = http.createServer();
  createChatServer(server);
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function wsConnect(server) {
  const { port } = server.address();
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/chat`);
    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });
}

function nextMessage(ws) {
  return new Promise((resolve) => {
    ws.once('message', (data) => resolve(JSON.parse(data.toString())));
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ChatServer WebSocket protocol', () => {
  let server;

  beforeAll(async () => {
    server = await startServer();
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockMembers.length = 0;
    mockHistory.length = 0;
  });

  test('sends error on invalid JSON', async () => {
    const ws = await wsConnect(server);
    const msgPromise = nextMessage(ws);
    ws.send('not json');
    const frame = await msgPromise;
    expect(frame.type).toBe('error');
    ws.close();
  });

  test('sends error on unknown message type', async () => {
    const ws = await wsConnect(server);
    const msgPromise = nextMessage(ws);
    ws.send(JSON.stringify({ type: 'unknown' }));
    const frame = await msgPromise;
    expect(frame.type).toBe('error');
    ws.close();
  });

  test('join returns joined frame with members and history', async () => {
    const ws = await wsConnect(server);
    const msgPromise = nextMessage(ws);

    ws.send(JSON.stringify({
      type:      'join',
      roomId:    'room-1',
      userId:    'alice',
      publicKey: 'pubkeyAlice',
    }));

    const frame = await msgPromise;
    expect(frame.type).toBe('joined');
    expect(frame.roomId).toBe('room-1');
    expect(Array.isArray(frame.members)).toBe(true);
    expect(Array.isArray(frame.history)).toBe(true);
    ws.close();
  });

  test('join sends error when fields are missing', async () => {
    const ws = await wsConnect(server);
    const msgPromise = nextMessage(ws);
    ws.send(JSON.stringify({ type: 'join', roomId: 'room-1' }));
    const frame = await msgPromise;
    expect(frame.type).toBe('error');
    ws.close();
  });

  test('second client receives member_joined notification', async () => {
    const ws1 = await wsConnect(server);
    // ws1 joins first
    ws1.send(JSON.stringify({
      type:      'join',
      roomId:    'room-notify',
      userId:    'alice',
      publicKey: 'pk-alice',
    }));
    await nextMessage(ws1); // consume joined

    const ws2 = await wsConnect(server);
    const notifyPromise = nextMessage(ws1); // ws1 should receive member_joined
    ws2.send(JSON.stringify({
      type:      'join',
      roomId:    'room-notify',
      userId:    'bob',
      publicKey: 'pk-bob',
    }));
    await nextMessage(ws2); // consume ws2's joined

    const notify = await notifyPromise;
    expect(notify.type).toBe('member_joined');
    expect(notify.userId).toBe('bob');

    ws1.close();
    ws2.close();
  });

  test('message is broadcast to room members', async () => {
    const ws1 = await wsConnect(server);
    ws1.send(JSON.stringify({ type: 'join', roomId: 'room-msg', userId: 'alice', publicKey: 'pk-a' }));
    await nextMessage(ws1);

    const ws2 = await wsConnect(server);
    ws2.send(JSON.stringify({ type: 'join', roomId: 'room-msg', userId: 'bob', publicKey: 'pk-b' }));
    await nextMessage(ws2);

    // ws1 will receive member_joined for bob; consume it
    const memberJoined = await nextMessage(ws1);
    expect(memberJoined.type).toBe('member_joined');

    // Collect broadcast on ws1 when ws2 sends a message
    const broadcastPromise = nextMessage(ws1);
    ws2.send(JSON.stringify({
      type:             'message',
      roomId:           'room-msg',
      userId:           'bob',
      encryptedPayload: JSON.stringify({ ciphertext: 'abc', nonce: 'xyz' }),
    }));

    const broadcast = await broadcastPromise;
    expect(broadcast.type).toBe('message');
    expect(broadcast.senderId).toBe('bob');

    ws1.close();
    ws2.close();
  });

  test('message sends error when fields are missing', async () => {
    const ws = await wsConnect(server);
    ws.send(JSON.stringify({ type: 'join', roomId: 'r', userId: 'u', publicKey: 'pk' }));
    await nextMessage(ws);

    const errPromise = nextMessage(ws);
    ws.send(JSON.stringify({ type: 'message', roomId: 'r' }));
    const frame = await errPromise;
    expect(frame.type).toBe('error');
    ws.close();
  });
});
