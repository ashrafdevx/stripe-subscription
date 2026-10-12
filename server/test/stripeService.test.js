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

test('creates a new $10 USD PaymentIntent without creating a purchase before payment', async () => {
  const stripeClient = createStripeClient();

  const firstClientSecret = await createPaymentIntent({ stripeClient });
  const secondClientSecret = await createPaymentIntent({ stripeClient });

  assert.notEqual(firstClientSecret, secondClientSecret);
  assert.equal(stripeClient.created.length, 2);
  assert.deepEqual(stripeClient.created[0].params, {
    amount: 1000,
    currency: 'usd',
    metadata: { productName: 'The Sunday Ceramic Cup' },
  });
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
    }),
    (error) => {
      assert.equal(error.stage, 'stripe.create_payment_intent');
      assert.equal(error.cause, stripeError);
      return true;
    },
  );
});
