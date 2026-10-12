
const express = require('express');
const { createPaymentIntent } = require('../services/stripeService');

const router = express.Router();

router.post('/create-payment-intent', async (req, res) => {
  try {
    const clientSecret = await createPaymentIntent();

    return res.status(200).json({ clientSecret });
    
  } catch (error) {
    const cause = error.cause || error;
    console.error('Stripe PaymentIntent creation failed:', {
      stage: error.stage || 'unknown',
      message: cause.message,
      type: cause.type,
      code: cause.code,
      statusCode: cause.statusCode,
      requestId: cause.requestId,
    });

    return res.status(500).json({
      error: 'Could not create a payment.',
    });
  }
});

module.exports = router;
