const Stripe = require('stripe');
const PaymentLog = require('../models/PaymentLog');
const Purchase = require('../models/Purchase');

const stripe = Stripe(process.env.STRIPE_SERVER_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const paymentStatuses = {
  'payment_intent.succeeded': 'succeeded',
  'payment_intent.processing': 'processing',
  'payment_intent.payment_failed': 'failed',
  'payment_intent.canceled': 'canceled',
};

async function recordStripeEvent(rawBody, signature) {
  const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  const paymentIntent = event.data.object;
  const isPaymentIntent = paymentIntent.object === 'payment_intent';
  const nextStatus = paymentStatuses[event.type];
  let purchase = null;

  if (isPaymentIntent && nextStatus) {
    const statusFilter = nextStatus === 'succeeded'
      ? {}
      : { status: { $nin: ['succeeded', 'canceled'] } };
    const update = { status: nextStatus };

    if (nextStatus === 'succeeded') {
      update.paidAt = new Date(event.created * 1000);
    }

    purchase = await Purchase.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntent.id, ...statusFilter },
      { $set: update },
      { new: true },
    );

    if (!purchase) {
      purchase = await Purchase.findOne({ stripePaymentIntentId: paymentIntent.id });
    }
  }

  const outcome = !isPaymentIntent || !nextStatus
    ? 'ignored'
    : purchase?.status || 'purchase_not_found';

  try {
    await PaymentLog.create({
      stripeEventId: event.id,
      eventType: event.type,
      stripePaymentIntentId: isPaymentIntent ? paymentIntent.id : undefined,
      purchase: purchase?._id,
      outcome,
      amount: isPaymentIntent ? paymentIntent.amount : undefined,
      currency: isPaymentIntent ? paymentIntent.currency : undefined,
    });
  } catch (error) {
    if (error.code === 11000) {
      return { duplicate: true };
    }
    throw error;
  }

  return { duplicate: false };
}

module.exports = { recordStripeEvent };
