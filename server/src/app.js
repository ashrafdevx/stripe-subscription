const cors = require('cors');
const express = require('express');
const paymentRoutes = require('./routes/paymentRoutes');
const stripeWebhookRoutes = require('./routes/stripeWebhookRoutes');

const app = express();
const clientUrls = new Set([
  'http://localhost:5173',
  'https://stripe-subscription-black.vercel.app',
  ...(process.env.CLIENT_URL || '').split(','),
].map((url) => url.trim().replace(/\/+$/, '')).filter(Boolean));

app.use(cors({
  origin: (origin, callback) => {
    callback(null, !origin || clientUrls.has(origin.replace(/\/+$/, '')));
  },
}));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/webhooks', stripeWebhookRoutes);
app.use(express.json());
app.use('/', paymentRoutes);

module.exports = app;
