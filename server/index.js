const cors = require('cors');
const express = require('express');
const Stripe = require('stripe');
const path = require('node:path');

require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const app = express();
const port = process.env.PORT || 3000;
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  console.error('Missing STRIPE_SECRET_KEY. Add your Stripe test secret key to server/.env.');
  process.exit(1);
}

const stripe = Stripe(secretKey);

app.use(cors({ origin: clientUrl }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/create-checkout-session', async (_req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'Demo Product' },
            unit_amount: 1000,
          },
          quantity: 1,
        },
      ],
      success_url: `${clientUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/?checkout=cancel`,
    });

    if (!session.url) {
      throw new Error('Stripe did not return a Checkout URL.');
    }

    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe Checkout session creation failed:', error);
    res.status(502).json({ error: 'Could not start checkout. Check the server configuration and try again.' });
  }
});

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
