
const Stripe = require('stripe');
const Purchase = require('../models/Purchase');

const stripe = Stripe(process.env.STRIPE_SERVER_SECRET_KEY);

function paymentError(stage, cause) {
  const error = new Error(cause.message, { cause });
  error.name = 'PaymentIntentSetupError';
  error.stage = stage;
  return error;
}

async function createPaymentIntent({
  stripeClient = stripe,
  purchaseModel = Purchase,
  logger = console,
} = {}) {
  const product = {
    name: 'The Sunday Ceramic Cup',
    amount: 1000, // $10.00 USD (amount is in cents)
    currency: 'usd',
  };

  let paymentIntent;
  try {
    paymentIntent = await stripeClient.paymentIntents.create({
      amount: product.amount,
      currency: product.currency,
      metadata: {
        productName: product.name,
      },
    });
  } catch (error) {
    throw paymentError('stripe.create_payment_intent', error);
  }

  if (!paymentIntent.client_secret) {
    throw paymentError(
      'stripe.create_payment_intent',
      new Error('Stripe did not return a PaymentIntent client secret.'),
    );
  }

  try {
    await purchaseModel.create({
      stripePaymentIntentId: paymentIntent.id,
      productName: product.name,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: 'pending',
    });
  } catch (error) {
    try {
      await stripeClient.paymentIntents.cancel(paymentIntent.id);
    } catch (cancelError) {
      logger.error('Could not cancel unrecorded PaymentIntent:', {
        message: cancelError.message,
        type: cancelError.type,
        code: cancelError.code,
        statusCode: cancelError.statusCode,
        requestId: cancelError.requestId,
      });
    }

    throw paymentError('mongodb.persist_purchase', error);
  }

  return paymentIntent.client_secret;
}

module.exports = { createPaymentIntent };
