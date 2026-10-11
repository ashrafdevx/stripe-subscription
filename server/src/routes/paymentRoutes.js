const express = require('express');
const { createPaymentIntent } = require('../services/stripeService');

const router = express.Router();

router.post('/create-payment-intent', async (req, res) => {
  try {
    const { productKey } = req.body;
     if (!productKey) {
      return res.status(400).json({
        error: 'productKey is required.',
      });
    }
    const clientSecret = await createPaymentIntent(productKey);
    res.json({ clientSecret });
  } catch (error) {
    console.error('Stripe PaymentIntent creation failed:', error);
    res.status(502).json({ error: 'Could not create a payment. Check the server configuration and try again.' });
  }
});

module.exports = router;
