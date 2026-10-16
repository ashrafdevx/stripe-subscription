
const Stripe = require('stripe');
const demoProducts = require('../config/demoProducts');

const stripe = Stripe(process.env.STRIPE_SERVER_SECRET_KEY);

function paymentError(stage, cause) {
  const error = new Error(cause.message, { cause });
  error.name = 'PaymentIntentSetupError';
  error.stage = stage;
  return error;
}

async function createPaymentIntent({
  stripeClient = stripe,
  source,
  productId,
  priceId,
  userId,
} = {}) {
  let product;
  let intentMetadata;

  if (source === 'demo') {
    product = demoProducts.find((item) => item.id === productId);
    if (!product) {
      const error = new Error('Choose a valid demo product.');
      error.statusCode = 400;
      throw error;
    }
    intentMetadata = {
      productSource: 'demo',
      productId: product.id,
      productName: product.name,
      productDescription: product.description,
      ...(userId ? { userId: userId.toString() } : {}),
    };
  } else if (source === 'stripe') {
    if (typeof priceId !== 'string' || !priceId.startsWith('price_')) {
      const error = new Error('Choose a valid Stripe product price.');
      error.statusCode = 400;
      throw error;
    }

    let price;
    try {
      price = await stripeClient.prices.retrieve(priceId, { expand: ['product'] });
    } catch (error) {
      throw paymentError('stripe.retrieve_price', error);
    }

    product = price.product;
    if (
      !price.active ||
      price.type !== 'one_time' ||
      price.unit_amount === null ||
      typeof product !== 'object' ||
      !product.active
    ) {
      const error = new Error('The selected Stripe product price is unavailable.');
      error.statusCode = 400;
      throw error;
    }
    intentMetadata = {
      productSource: 'stripe',
      priceId: price.id,
      productId: product.id,
      productName: product.name,
      productDescription: product.description || '',
      ...(userId ? { userId: userId.toString() } : {}),
    };
    product = {
      ...product,
      amount: price.unit_amount,
      currency: price.currency,
    };
  } else {
    const error = new Error('Choose a valid product source.');
    error.statusCode = 400;
    throw error;
  }

  let paymentIntent;
  try {
    paymentIntent = await stripeClient.paymentIntents.create({
      amount: product.amount,
      currency: product.currency,
      metadata: intentMetadata,
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
