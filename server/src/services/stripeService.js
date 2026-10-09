const Stripe = require('stripe');

const stripe = Stripe(process.env.STRIPE_SERVER_SECRET_KEY);

async function createPaymentIntent() {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: 1000,
    currency: 'usd',
    allowed_payment_method_types: ['card'],
  });

  if (!paymentIntent.client_secret) {
    throw new Error('Stripe did not return a PaymentIntent client secret.');
  }

  return paymentIntent.client_secret;
}

module.exports = { createPaymentIntent };
