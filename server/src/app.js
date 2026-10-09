const cors = require('cors');
const express = require('express');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({ origin: clientUrl }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/', paymentRoutes);

module.exports = app;
