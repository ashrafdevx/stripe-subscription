const express = require('express');
const { recordStripeEvent } = require('../services/stripeWebhookService');

const router = express.Router();

router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const result = await recordStripeEvent(req.body, req.headers['stripe-signature']);
    res.json({ received: true, duplicate: result.duplicate });
  } catch (error) {
    if (error.type === 'StripeSignatureVerificationError') {
      return res.status(400).json({ error: 'Invalid Stripe webhook signature.' });
    }

    console.error('Stripe webhook processing failed:', error);
    return res.status(500).json({ error: 'Could not process the Stripe webhook.' });
  }
});

module.exports = router;
