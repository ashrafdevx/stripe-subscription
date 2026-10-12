
const express = require('express');
const { createPaymentIntent } = require('../services/stripeService');

const router = express.Router();

router.post('/create-payment-intent', async (req, res) => {
  try {
    const clientSecret = await createPaymentIntent();

    return res.status(200).json({ clientSecret });
  } catch (error) {
    console.error('Stripe PaymentIntent creation failed:', {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
    });

    return res.status(500).json({
      error: 'Could not create a payment.',
    });
  }
});

module.exports = router;
