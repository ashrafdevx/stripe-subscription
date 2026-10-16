const assert = require('node:assert/strict');
const { test } = require('node:test');

process.env.STRIPE_SERVER_SECRET_KEY ||= 'sk_test_unit_test_key';
process.env.STRIPE_WEBHOOK_SECRET ||= 'whsec_unit_test_secret';
const { recordStripeEvent } = require('../src/services/stripeWebhookService');

function createDependencies({ updateResult = null } = {}) {
  const event = {
    id: 'evt_test_pending',
    type: 'payment_intent.created',
    created: 1,
    data: {
      object: {
        id: 'pi_test_pending',
        object: 'payment_intent',
        amount: 1000,
        currency: 'usd',
        metadata: {
          productSource: 'stripe',
          priceId: 'price_sunday_cup',
          productId: 'prod_sunday_cup',
          productName: 'The Sunday Ceramic Cup',
          productDescription: 'A hand-finished stoneware cup for slow mornings.',
        },
      },
    },
  };
  const updates = [];
  const logs = [];

  return {
    event,
    updates,
    logs,
    stripeClient: {
      webhooks: {
        constructEvent: (rawBody, signature, secret) => {
          assert.equal(rawBody, 'raw-body');
          assert.equal(signature, 'valid-signature');
          assert.equal(secret, 'whsec_unit_test_secret');
          return event;
        },
      },
    },
    purchaseModel: {
      findOneAndUpdate: async (...args) => {
        updates.push(args);
        return updateResult;
      },
    },
    paymentLogModel: {
      create: async (log) => logs.push(log),
    },
  };
}

test('records payment_intent.created as pending without creating a purchase', async () => {
  const dependencies = createDependencies();

  const result = await recordStripeEvent('raw-body', 'valid-signature', dependencies);

  assert.deepEqual(result, { duplicate: false });
  assert.equal(dependencies.updates.length, 0);
  assert.equal(dependencies.logs.length, 1);
  assert.equal(dependencies.logs[0].eventType, 'payment_intent.created');
  assert.equal(dependencies.logs[0].outcome, 'pending');
  assert.equal(dependencies.logs[0].purchase, undefined);
});

test('creates a purchase on the first successful webhook event', async () => {
  const dependencies = createDependencies({
    updateResult: { _id: 'purchase_test', status: 'succeeded' },
  });
  dependencies.event.type = 'payment_intent.succeeded';

  const result = await recordStripeEvent('raw-body', 'valid-signature', dependencies);

  assert.deepEqual(result, { duplicate: false });
  assert.deepEqual(dependencies.updates[0], [
    { stripePaymentIntentId: 'pi_test_pending' },
    {
      $set: {
        status: 'succeeded',
        paidAt: new Date(1000),
      },
      $setOnInsert: {
        productSource: 'stripe',
        priceId: 'price_sunday_cup',
        productId: 'prod_sunday_cup',
        productName: 'The Sunday Ceramic Cup',
        productDescription: 'A hand-finished stoneware cup for slow mornings.',
        amount: 1000,
        currency: 'usd',
      },
    },
    { new: true, upsert: true, runValidators: true },
  ]);
  assert.equal(dependencies.logs[0].outcome, 'succeeded');
  assert.equal(dependencies.logs[0].purchase, 'purchase_test');
});

test('logs a failed webhook event without creating a purchase', async () => {
  const dependencies = createDependencies();
  dependencies.event.type = 'payment_intent.payment_failed';

  const result = await recordStripeEvent('raw-body', 'valid-signature', dependencies);

  assert.deepEqual(result, { duplicate: false });
  assert.equal(dependencies.updates.length, 0);
  assert.equal(dependencies.logs[0].outcome, 'failed');
  assert.equal(dependencies.logs[0].purchase, undefined);
});
