const http = require('http');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const employeeRoutes = require('./routes/employees');
const chatRoutes = require('./routes/chat');
const { createChatServer } = require('./chat/chatServer');

const app = express();
const PORT = process.env.PORT || 5000;

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

app.use(cors());
app.use(express.json());

app.use('/api/', apiLimiter);
app.use('/api/employees', employeeRoutes);
app.use('/api/chat', chatRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const server = http.createServer(app);
createChatServer(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
