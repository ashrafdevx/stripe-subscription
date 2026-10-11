
const Stripe = require('stripe');
const Purchase = require('../models/Purchase');

const stripe = Stripe(process.env.STRIPE_SERVER_SECRET_KEY);

async function createPaymentIntent(productKey) {
  // For now, this is a fixed learning-project product.
  const product = {
    name: 'The Sunday Ceramic Cup',
    amount: 1000, // 1000 cents = $10.00
    currency: 'usd',
  };

  const paymentIntent = await stripe.paymentIntents.create({
    amount: product.amount,
    currency: product.currency,
    payment_method_types: ['card'],
    metadata: {
      productKey: productKey || 'sunday-ceramic-cup',
      productName: product.name,
    },
  });

  if (!paymentIntent.client_secret) {
    throw new Error('Stripe did not return a PaymentIntent client secret.');
  }

  try {
    await Purchase.create({
      stripePaymentIntentId: paymentIntent.id,
      productName: product.name,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: 'pending',
    });
  } catch (error) {
    try {
      await stripe.paymentIntents.cancel(paymentIntent.id);
    } catch (cancelError) {
      console.error(
        'Could not cancel unrecorded PaymentIntent:',
        cancelError.message,
      );
    }

    throw error;
  }

  return paymentIntent.client_secret;
}

module.exports = { createPaymentIntent };
