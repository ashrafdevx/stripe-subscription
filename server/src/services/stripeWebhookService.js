const Stripe = require('stripe');
const PaymentLog = require('../models/PaymentLog');
const Purchase = require('../models/Purchase');

const stripe = Stripe(process.env.STRIPE_SERVER_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const paymentStatuses = {
  'payment_intent.created': 'pending',
  'payment_intent.succeeded': 'succeeded',
  'payment_intent.processing': 'processing',
  'payment_intent.payment_failed': 'failed',
  'payment_intent.canceled': 'canceled',
};

async function recordStripeEvent(rawBody, signature, {
  stripeClient = stripe,
  paymentLogModel = PaymentLog,
  purchaseModel = Purchase,
} = {}) {
  const event = stripeClient.webhooks.constructEvent(rawBody, signature, webhookSecret);
  const paymentIntent = event.data.object;
  const isPaymentIntent = paymentIntent.object === 'payment_intent';
  const nextStatus = paymentStatuses[event.type];
  let purchase = null;

  if (isPaymentIntent && nextStatus === 'succeeded') {
    purchase = await purchaseModel.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntent.id },
      {
        $set: {
          status: 'succeeded',
          paidAt: new Date(event.created * 1000),
        },
        $setOnInsert: {
          productName: paymentIntent.metadata?.productName || 'The Sunday Ceramic Cup',
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        },
      },
      { new: true, upsert: true, runValidators: true },
    );
  }

  const outcome = !isPaymentIntent || !nextStatus
    ? 'ignored'
    : nextStatus;

  try {
    await paymentLogModel.create({
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
