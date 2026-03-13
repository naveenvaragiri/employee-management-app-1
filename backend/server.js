const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const employeeRoutes = require('./routes/employees');

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

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
