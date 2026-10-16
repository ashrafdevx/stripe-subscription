const cors = require('cors');
const express = require('express');
const authRoutes = require('./routes/authRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const productRoutes = require('./routes/productRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const stripeWebhookRoutes = require('./routes/stripeWebhookRoutes');
const { clientOrigins } = require('./config/clientOrigins');

const app = express();
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(cors({
  origin: (origin, callback) => {
    callback(null, !origin || clientOrigins.has(origin.replace(/\/+$/, '')));
  },
  credentials: true,
}));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/webhooks', stripeWebhookRoutes);
app.use(express.json({ limit: '10kb' }));
app.use('/auth', authRoutes());
app.use('/purchases', purchaseRoutes);
app.use('/products', productRoutes);
app.use('/', paymentRoutes);

app.use((error, _req, res, _next) => {
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body must be valid JSON.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large.' });
  }

  console.error('Request failed:', {
    name: error.name,
    code: error.code,
    statusCode: error.statusCode,
  });
  return res.status(500).json({ error: 'An unexpected server error occurred.' });
});

module.exports = app;
