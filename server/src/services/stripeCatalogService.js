const Stripe = require('stripe');

const stripe = Stripe(process.env.STRIPE_SERVER_SECRET_KEY);

async function listProducts({ stripeClient = stripe } = {}) {
  const prices = [];
  let startingAfter;
  let hasMore = true;

  while (hasMore) {
    const page = await stripeClient.prices.list({
      active: true,
      limit: 100,
      expand: ['data.product'],
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    prices.push(...page.data);
    hasMore = page.has_more;
    startingAfter = page.data.at(-1)?.id;
    if (hasMore && !startingAfter) {
      throw new Error('Stripe returned an incomplete product price page.');
    }
  }

  return prices
    .filter((price) => price.type === 'one_time' && price.unit_amount !== null)
    .filter((price) => typeof price.product === 'object' && price.product.active)
    .map((price) => ({
      priceId: price.id,
      productId: price.product.id,
      name: price.product.name,
      description: price.product.description || '',
      images: price.product.images || [],
      amount: price.unit_amount,
      currency: price.currency,
    }));
}

module.exports = { listProducts };
