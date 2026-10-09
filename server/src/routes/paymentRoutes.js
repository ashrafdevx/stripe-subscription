const express = require('express');
const { createPaymentIntent } = require('../services/stripeService');

const router = express.Router();

router.post('/create-payment-intent', async (_req, res) => {
  try {
    const clientSecret = await createPaymentIntent();
    res.json({ clientSecret });
  } catch (error) {
    console.error('Stripe PaymentIntent creation failed:', error);
    res.status(502).json({ error: 'Could not create a payment. Check the server configuration and try again.' });
  }
});

module.exports = router;
