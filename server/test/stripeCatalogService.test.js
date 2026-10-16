const assert = require('node:assert/strict');
const { test } = require('node:test');

process.env.STRIPE_SERVER_SECRET_KEY ||= 'sk_test_unit_test_key';
const { listProducts } = require('../src/services/stripeCatalogService');

test('lists active one-time Stripe prices with their products', async () => {
  const products = await listProducts({
    stripeClient: {
      prices: {
        list: async (params) => {
          assert.deepEqual(params, {
            active: true,
            limit: 100,
            expand: ['data.product'],
          });
          return {
            data: [
              {
                id: 'price_cup',
                active: true,
                type: 'one_time',
                unit_amount: 1000,
                currency: 'usd',
                product: {
                  id: 'prod_cup',
                  active: true,
                  name: 'Cup',
                  description: 'A ceramic cup',
                  images: [],
                },
              },
              {
                id: 'price_subscription',
                type: 'recurring',
                unit_amount: 500,
                currency: 'usd',
                product: { id: 'prod_subscription', active: true, name: 'Subscription' },
              },
              {
                id: 'price_inactive_product',
                type: 'one_time',
                unit_amount: 500,
                currency: 'usd',
                product: { id: 'prod_inactive', active: false, name: 'Inactive' },
              },
            ],
          };
        },
      },
    },
  });

  assert.deepEqual(products, [{
    priceId: 'price_cup',
    productId: 'prod_cup',
    name: 'Cup',
    description: 'A ceramic cup',
    images: [],
    amount: 1000,
    currency: 'usd',
  }]);
});
