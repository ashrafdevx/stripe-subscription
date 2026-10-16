const assert = require('node:assert/strict');
const { test } = require('node:test');

process.env.STRIPE_SERVER_SECRET_KEY ||= 'sk_test_unit_test_key';
const { createPaymentIntent } = require('../src/services/stripeService');

function createStripeClient() {
  const retrievedPriceIds = [];
  const createdIntents = [];
  return {
    retrievedPriceIds,
    createdIntents,
    prices: {
      retrieve: async (priceId, options) => {
        retrievedPriceIds.push(priceId);
        assert.deepEqual(options, { expand: ['product'] });
        const price = priceId === 'price_coffee'
          ? { id: priceId, active: true, type: 'one_time', unit_amount: 2450, currency: 'usd' }
          : { id: priceId, active: true, type: 'one_time', unit_amount: 1000, currency: 'usd' };
        return {
          ...price,
          product: {
            id: priceId === 'price_coffee' ? 'prod_coffee' : 'prod_cup',
            name: priceId === 'price_coffee' ? 'Pour-Over Coffee Kit' : 'The Sunday Ceramic Cup',
            description: 'Stripe product description',
            active: true,
          },
        };
      },
    },
    paymentIntents: {
      create: async (params) => {
        const id = `pi_test_${createdIntents.length + 1}`;
        createdIntents.push({ id, params });
        return {
          id,
          amount: params.amount,
          currency: params.currency,
          client_secret: `${id}_secret_test`,
        };
      },
    },
  };
}

test('retrieves the Stripe price and creates PaymentIntent using its server-side amount', async () => {
  const stripeClient = createStripeClient();

  const firstClientSecret = await createPaymentIntent({ stripeClient, source: 'stripe', priceId: 'price_cup' });
  const secondClientSecret = await createPaymentIntent({ stripeClient, source: 'stripe', priceId: 'price_coffee' });

  assert.notEqual(firstClientSecret, secondClientSecret);
  assert.deepEqual(stripeClient.retrievedPriceIds, ['price_cup', 'price_coffee']);
  assert.equal(stripeClient.createdIntents.length, 2);
  assert.deepEqual(stripeClient.createdIntents[0].params, {
    amount: 1000,
    currency: 'usd',
    metadata: {
      productSource: 'stripe',
      priceId: 'price_cup',
      productId: 'prod_cup',
      productName: 'The Sunday Ceramic Cup',
      productDescription: 'Stripe product description',
    },
  });
  assert.equal(stripeClient.createdIntents[1].params.amount, 2450);
  assert.equal(stripeClient.createdIntents[1].params.metadata.productId, 'prod_coffee');
});

test('creates hardcoded demo product PaymentIntents at server catalog prices', async () => {
  const stripeClient = createStripeClient();
  await createPaymentIntent({
    stripeClient,
    source: 'demo',
    productId: 'pour-over-coffee-kit',
  });

  assert.equal(stripeClient.createdIntents[0].params.amount, 2450);
  assert.equal(stripeClient.createdIntents[0].params.metadata.productSource, 'demo');
  assert.equal(stripeClient.createdIntents[0].params.metadata.productName, 'Pour-Over Coffee Kit');
});

test('rejects invalid or inactive Stripe prices', async () => {
  await assert.rejects(
    createPaymentIntent({ stripeClient: createStripeClient(), source: 'stripe', priceId: 'not-a-price' }),
    { statusCode: 400 },
  );
  await assert.rejects(
    createPaymentIntent({
      priceId: 'price_inactive',
      source: 'stripe',
      stripeClient: {
        prices: {
          retrieve: async () => ({
            id: 'price_inactive',
            active: false,
            type: 'one_time',
            unit_amount: 1000,
            currency: 'usd',
            product: { id: 'prod_inactive', active: true, name: 'Inactive' },
          }),
        },
      },
    }),
    { statusCode: 400 },
  );
});

test('identifies Stripe PaymentIntent creation failures', async () => {
  const stripeError = new Error('Stripe request failed');

  await assert.rejects(
    createPaymentIntent({
      priceId: 'price_cup',
      source: 'stripe',
      stripeClient: {
        prices: {
          retrieve: async () => ({
            id: 'price_cup',
            active: true,
            type: 'one_time',
            unit_amount: 1000,
            currency: 'usd',
            product: { id: 'prod_cup', active: true, name: 'Cup', description: '' },
          }),
        },
        paymentIntents: {
          create: async () => { throw stripeError; },
        },
      },
    }),
    (error) => {
      assert.equal(error.stage, 'stripe.create_payment_intent');
      assert.equal(error.cause, stripeError);
      return true;
    },
  );
});
