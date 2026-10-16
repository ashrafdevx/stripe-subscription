
const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const { createPaymentIntent } = require('../services/stripeService');

const router = express.Router();

router.post('/create-payment-intent', requireAuth, async (req, res) => {
  try {
    const clientSecret = await createPaymentIntent({
      source: req.body?.source,
      productId: req.body?.productId,
      priceId: req.body?.priceId,
      userId: req.auth.userId,
    });

    return res.status(200).json({ clientSecret });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({ error: error.message });
    }

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
