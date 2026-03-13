const express = require('express');
const router = express.Router();
const chatDb = require('../chat/chatDatabase');

// GET /api/chat/rooms
router.get('/rooms', async (req, res) => {
  try {
    const rooms = await chatDb.listRooms();
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chat rooms' });
  }
});

// POST /api/chat/rooms
router.post('/rooms', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Room name is required' });
    }
    const room = await chatDb.createRoom(name.trim());
    res.status(201).json(room);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create chat room' });
  }
});

// GET /api/chat/rooms/:roomId/messages?limit=50
router.get('/rooms/:roomId/messages', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const messages = await chatDb.getMessages(req.params.roomId, limit);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// GET /api/chat/rooms/:roomId/members
router.get('/rooms/:roomId/members', async (req, res) => {
  try {
    const members = await chatDb.getRoomMembers(req.params.roomId);
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch room members' });
  }
});

module.exports = router;
