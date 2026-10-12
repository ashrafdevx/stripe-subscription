
const Stripe = require('stripe');

const stripe = Stripe(process.env.STRIPE_SERVER_SECRET_KEY);

function paymentError(stage, cause) {
  const error = new Error(cause.message, { cause });
  error.name = 'PaymentIntentSetupError';
  error.stage = stage;
  return error;
}

async function createPaymentIntent({
  stripeClient = stripe,
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

  return paymentIntent.client_secret;
}

module.exports = { createPaymentIntent };
