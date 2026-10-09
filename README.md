# Simple Stripe Checkout Demo

A small React storefront, Express API, and Stripe PaymentIntent flow. The demo sells one fixed product for $10.00 USD in Stripe test mode.

## What it does and why

- **`client/src/App.jsx`** requests a PaymentIntent, then shows Stripe's Payment Element and confirms the payment with Stripe.js. Card details go directly to Stripe, not to this app's server.
- **Backend structure:** `server/index.js` loads local configuration and starts the app; `server/src/app.js` configures Express; `server/src/routes/paymentRoutes.js` maps payment URLs to HTTP responses; `server/src/services/stripeService.js` contains the Stripe calls and fixed demo price. The browser cannot change the amount.
- **`server/.env.example`** contains placeholders only; never put real credentials in this example file or commit them.
- **Payment result messages** are for demo feedback only. The project does not yet save orders or verify payment completion with a webhook.

## Setup

1. In the Stripe Dashboard, use matching test-mode API keys: a secret key (`sk_test_...`) and a publishable key (`pk_test_...`).
2. Keep the secret key on the server. Add your credentials to ignored local environment files (never the example file or Git):

   - Put `STRIPE_SERVER_SECRET_KEY=sk_test_...` in `server/.env` (copy `server/.env.example` as a placeholder starting point), or set it in the workspace-root `.env.local`.
   - Put `STRIPE_PUBLISHABLE_KEY=pk_test_...` in the workspace-root `.env.local`. Vite exposes only this publishable key to the browser; it never exposes the server secret key.
   - The app also accepts `VITE_STRIPE_PUBLISHABLE_KEY` from Vite's environment configuration.

   Restart the development processes after changing environment files.
3. Install dependencies and start both services from the project root:

   ```sh
   npm install
   cd server && npm install
   cd ../client && npm install
   cd .. && npm run dev
   ```

   The root command runs the API and storefront together. `nodemon` restarts the API when server files change and manages the Vite process in the client; Vite HMR updates frontend components and styles without restarting the server. The API is at `http://localhost:3000`; `GET /health` checks that it is running.

4. Open the Vite URL (normally `http://localhost:5173`), press **Continue to secure payment**, enter Stripe's test card `4242 4242 4242 4242`, and submit. Use a future expiry date and any CVC. Do not use a real card for this demo. Check the Stripe Dashboard's **Test mode → Payments** to confirm the test payment.

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

The server defaults to port `3000` and client origin `http://localhost:5173`. Override these with `PORT` and `CLIENT_URL` in `server/.env` if needed. The client API address can be overridden with `VITE_API_URL`.

## API

- `GET /health` — returns `{ "status": "ok" }`.
- `POST /create-payment-intent` — creates a fixed $10.00 USD card-only PaymentIntent and returns `{ "clientSecret": "..." }` for Stripe.js.

Backend files are split by job: `server/index.js` starts the server, `server/src/app.js` configures Express, `server/src/routes/paymentRoutes.js` handles HTTP requests, and `server/src/services/stripeService.js` makes Stripe API calls.

This is an educational starter, not a production payment implementation: add webhook signature verification, order persistence, idempotency, and operational monitoring before fulfilling real orders. A browser success message is not proof of payment.
