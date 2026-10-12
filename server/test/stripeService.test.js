const assert = require('node:assert/strict');
const { test } = require('node:test');

process.env.STRIPE_SERVER_SECRET_KEY ||= 'sk_test_unit_test_key';
const { createPaymentIntent } = require('../src/services/stripeService');

function createStripeClient() {
  const created = [];
  const canceled = [];

  return {
    created,
    canceled,
    paymentIntents: {
      create: async (params) => {
        const id = `pi_test_${created.length + 1}`;
        created.push({ id, params });
        return {
          id,
          amount: params.amount,
          currency: params.currency,
          client_secret: `${id}_secret_test`,
        };
      },
      cancel: async (id) => {
        canceled.push(id);
      },
    },
  };
}

test('creates a new $10 USD card PaymentIntent and records it as pending', async () => {
  const stripeClient = createStripeClient();
  const purchases = [];

  const firstClientSecret = await createPaymentIntent({
    stripeClient,
    purchaseModel: { create: async (purchase) => purchases.push(purchase) },
  });
  const secondClientSecret = await createPaymentIntent({
    stripeClient,
    purchaseModel: { create: async (purchase) => purchases.push(purchase) },
  });

  assert.notEqual(firstClientSecret, secondClientSecret);
  assert.equal(stripeClient.created.length, 2);
  assert.deepEqual(stripeClient.created[0].params, {
    amount: 1000,
    currency: 'usd',
    metadata: { productName: 'The Sunday Ceramic Cup' },
  });
  assert.deepEqual(purchases.map(({ stripePaymentIntentId, amount, currency, status }) => ({
    stripePaymentIntentId,
    amount,
    currency,
    status,
  })), [
    { stripePaymentIntentId: 'pi_test_1', amount: 1000, currency: 'usd', status: 'pending' },
    { stripePaymentIntentId: 'pi_test_2', amount: 1000, currency: 'usd', status: 'pending' },
  ]);
});

test('cancels an unrecorded PaymentIntent and identifies a MongoDB persistence failure', async () => {
  const stripeClient = createStripeClient();
  const databaseError = new Error('database write failed');

  await assert.rejects(
    createPaymentIntent({
      stripeClient,
      purchaseModel: { create: async () => { throw databaseError; } },
      logger: { error() {} },
    }),
    (error) => {
      assert.equal(error.stage, 'mongodb.persist_purchase');
      assert.equal(error.cause, databaseError);
      return true;
    },
  );

  assert.deepEqual(stripeClient.canceled, ['pi_test_1']);
});

test('identifies Stripe PaymentIntent creation failures', async () => {
  const stripeError = new Error('Stripe request failed');

  await assert.rejects(
    createPaymentIntent({
      stripeClient: {
        paymentIntents: {
          create: async () => { throw stripeError; },
        },
      },
      purchaseModel: { create: async () => assert.fail('purchase should not be saved') },
    }),
    (error) => {
      assert.equal(error.stage, 'stripe.create_payment_intent');
      assert.equal(error.cause, stripeError);
      return true;
    },
  );
});
