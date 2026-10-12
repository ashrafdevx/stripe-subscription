const assert = require('node:assert/strict');
const { once } = require('node:events');
const { test } = require('node:test');

process.env.STRIPE_SERVER_SECRET_KEY ||= 'sk_test_unit_test_key';
process.env.STRIPE_WEBHOOK_SECRET ||= 'whsec_unit_test_secret';
const app = require('../src/app');

test('webhook route receives the raw request body before JSON parsing', async (t) => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/webhooks/stripe`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': 't=1,v1=invalid',
    },
    body: '{}',
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: 'Invalid Stripe webhook signature.',
  });
});
