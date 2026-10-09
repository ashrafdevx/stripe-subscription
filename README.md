# Simple Stripe Checkout Demo

A small React storefront, Express API, and Stripe-hosted Checkout flow. The demo sells one fixed product for $10.00 USD in Stripe test mode.

## What it does and why

- **`client/src/App.jsx`** displays a sample product and asks the API to start checkout. It redirects the browser to Stripe's hosted checkout page, so card details never pass through this app.
- **`server/index.js`** keeps the Stripe secret key on the server and creates a Checkout Session with a server-defined product and price. The client cannot submit or change the amount.
- **`server/.env.example`** shows the server configuration shape without containing a real key. Copy it to `server/.env` and add your Stripe test secret key.
- **Success and cancel returns** display a demo message in the storefront. A redirect alone does not prove payment; production fulfillment must verify a Stripe webhook event such as `checkout.session.completed`.

## Setup

1. In the Stripe Dashboard, use a test-mode secret key (`sk_test_...`).
2. Copy `server/.env.example` to `server/.env` and set `STRIPE_SECRET_KEY`. The server also falls back to the workspace-root `.env.local` if `server/.env` does not define the key. Keep the real key server-side; never put it in a `VITE_` variable or commit it.
3. Install dependencies and start both services from the project root:

   ```sh
   npm install
   cd server && npm install
   cd ../client && npm install
   cd .. && npm run dev
   ```

   The root command runs the API and storefront together. `nodemon` restarts the API when server files change and manages the Vite process in the client; Vite HMR updates frontend components and styles without restarting the server. The API is at `http://localhost:3000`; `GET /health` checks that it is running.

4. Open the Vite URL (normally `http://localhost:5173`) and press **Continue to secure checkout**. Use Stripe's documented test card, for example `4242 4242 4242 4242`, with a future expiry and any CVC. Do not use a real card for this demo.

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
- `POST /create-checkout-session` — creates a new hosted Checkout Session and returns `{ "url": "..." }`.

This is an educational starter, not a production payment implementation: add webhook verification, order persistence, idempotency, and operational monitoring before fulfilling real orders.
