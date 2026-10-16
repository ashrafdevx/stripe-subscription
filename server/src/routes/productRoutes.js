const express = require('express');
const demoProducts = require('../config/demoProducts');
const { listProducts } = require('../services/stripeCatalogService');

const router = express.Router();

router.get('/demo', (_req, res) => {
  res.json({ products: demoProducts.map((product) => ({ ...product, source: 'demo' })) });
});

router.get('/', async (_req, res) => {
  try {
    const products = await listProducts();
    return res.json({ products });
  } catch (error) {
    console.error('Stripe product catalog request failed:', {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
      requestId: error.requestId,
    });
    return res.status(502).json({ error: 'Could not load products from Stripe.' });
  }
});

module.exports = router;
