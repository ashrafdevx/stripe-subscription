const Stripe = require('stripe');
const Purchase = require('../models/Purchase');

const stripe = Stripe(process.env.STRIPE_SERVER_SECRET_KEY);

async function createPaymentIntent() {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: 1000,
    currency: 'usd',
    allowed_payment_method_types: ['card'],
    metadata: { productName: 'The Sunday Ceramic Cup' },
  });

  if (!paymentIntent.client_secret) {
    throw new Error('Stripe did not return a PaymentIntent client secret.');
  }

  try {
    await Purchase.create({
      stripePaymentIntentId: paymentIntent.id,
      productName: 'The Sunday Ceramic Cup',
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: 'pending',
    });
  } catch (error) {
    try {
      await stripe.paymentIntents.cancel(paymentIntent.id);
    } catch (cancelError) {
      console.error(`Could not cancel unrecorded PaymentIntent ${paymentIntent.id}:`, cancelError);
    }
    throw error;
  }

  return paymentIntent.client_secret;
}

module.exports = { createPaymentIntent };
