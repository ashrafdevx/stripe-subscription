# Simple Stripe Checkout Demo

A small React storefront, Express API, and Stripe PaymentIntent flow. The demo sells one fixed product for $10.00 USD in Stripe test mode.

## What it does and why

- **`client/src/App.jsx`** requests a PaymentIntent, then shows Stripe's Payment Element and confirms the payment with Stripe.js. Card details go directly to Stripe, not to this app's server.
- **Backend structure:** `server/index.js` loads local configuration and starts the app; `server/src/app.js` configures Express; `server/src/routes/paymentRoutes.js` maps payment URLs to HTTP responses; `server/src/services/stripeService.js` contains the Stripe calls and fixed demo price. The browser cannot change the amount.
- **MongoDB purchases and payment logs** are written by the backend. A verified Stripe webhook—not the browser—marks a purchase as paid.

## Setup

1. In the Stripe Dashboard, use matching test-mode API keys: a secret key (`sk_test_...`) and a publishable key (`pk_test_...`).
2. Keep the secret key on the server. Add your credentials to ignored local environment files (never the example file or Git):
   - Copy `server/.env.example` to `server/.env`, then replace the placeholders with `STRIPE_SERVER_SECRET_KEY` and your MongoDB Atlas `MONGODB_URI`. Keep real values in `server/.env`; it is ignored by Git.
   - Put `STRIPE_PUBLISHABLE_KEY=pk_test_...` in the workspace-root `.env.local`. Vite exposes only this publishable key to the browser; it never exposes the server secret key.
   - The app also accepts `VITE_STRIPE_PUBLISHABLE_KEY` from Vite's environment configuration.
   - To override the API address, set `VITE_API_URL` in the workspace-root `.env.local` locally or in the frontend build environment in production. Otherwise, development uses `http://localhost:3000` and production uses the configured Render API URL.

   Restart the development processes after changing environment files.

3. In a second terminal, forward Stripe test webhooks to the backend:

   ```sh
   stripe listen --forward-to localhost:3000/webhooks/stripe
   ```

   Copy the `whsec_...` signing secret printed by Stripe CLI into `STRIPE_WEBHOOK_SECRET` in `server/.env`. Stripe CLI forwards the PaymentIntent events to the local webhook.

4. Install dependencies and start both services from the project root:

   ```sh
   npm install
   cd server && npm install
   cd ../client && npm install
   cd .. && npm run dev
   ```

   The root command runs the API and storefront together. `nodemon` restarts the API when server files change and manages the Vite process in the client; Vite HMR updates frontend components and styles without restarting the server. The API is at `http://localhost:3000`; `GET /health` checks that it is running.

5. Open the Vite URL (normally `http://localhost:5173`), press **Continue to secure payment**, enter Stripe's test card `4242 4242 4242 4242`, and submit. Use a future expiry date and any CVC. Do not use a real card for this demo. The verified webhook changes the matching purchase record to `succeeded` and adds a payment event log. Check the Stripe Dashboard's **Test mode → Payments** to confirm the test payment.

You can also run either service separately:

```sh
cd client
npm install
npm run dev
```

or:

```sh
cd server
npm run dev
```

Before deploying backend changes, run the backend tests and syntax checks, then build and lint the frontend:

```sh
cd server
npm test
npm run build
cd ../client
npm run build
npm run lint
```

The server defaults to port `3000` and client origin `http://localhost:5173`. Override these with `PORT` and `CLIENT_URL` in `server/.env` if needed. The client API address can be overridden with `VITE_API_URL`.

## API

- `GET /health` — returns `{ "status": "ok" }`.
- `POST /create-payment-intent` — creates a fixed $10.00 USD PaymentIntent using the payment methods enabled in the Stripe Dashboard and returns `{ "clientSecret": "..." }` for Stripe.js.
- `POST /webhooks/stripe` — accepts Stripe-signed webhook events, updates purchase status, and records each event once.

Each new checkout attempt creates a new PaymentIntent. Payment submission is locked while confirmation is in progress; after a completed or failed attempt, the UI requires a new PaymentIntent before another confirmation.

MongoDB uses two collections: `purchases` stores the product, amount, PaymentIntent ID, current status, and success time; `paymentlogs` stores Stripe event IDs, event types, outcomes, and related purchase IDs. Stripe event IDs are unique so webhook retries do not create duplicate logs. Backend files are split by job: `server/index.js` starts the server, `server/src/config/database.js` connects to MongoDB, `server/src/models/` defines both collections, `server/src/routes/` handles HTTP requests, and `server/src/services/` contains the Stripe and webhook logic.

This is an educational starter, not a production payment implementation. The browser's success message is not proof of payment; use the verified webhook-updated purchase record.

Set up a local listener

Run the following steps using the Stripe CLI
Show advanced options

##---
1
Download the Stripe CLI and log in with your Stripe account
$
stripe login
2
Forward events to your destination
$
stripe listen --all-snapshot --forward-to localhost:4242/webhook
Requires Stripe CLI v1.51.0. Upgrade the Stripe CLI.
3
Trigger events with the CLI
$
stripe trigger payment_intent.succeeded
