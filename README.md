# Simple Stripe Checkout Demo

A small React storefront, Express API, and Stripe PaymentIntent flow. The demo offers several products with server-controlled prices in Stripe test mode.

## What it does and why

- **`client/src/App.jsx`** provides two tabs: **All** shows the hardcoded demo catalog and **Stripe products** loads live products from Stripe. Selecting an item opens its detail page and checkout.
- **Backend structure:** `server/index.js` loads local configuration and starts the app; `server/src/app.js` configures Express; `server/src/routes/productRoutes.js` exposes both catalogs; `server/src/config/demoProducts.js` holds the demo catalog; `server/src/services/stripeCatalogService.js` reads Stripe products and prices; `server/src/routes/paymentRoutes.js` handles payment requests; `server/src/services/stripeService.js` creates PaymentIntents using server-side demo prices or active Stripe Prices.
- **MongoDB purchases and payment logs** are written by the backend. A verified Stripe webhook—not the browser—marks a purchase as paid.

## Setup

1. In the Stripe Dashboard, use matching test-mode API keys: a secret key (`sk_test_...`) and a publishable key (`pk_test_...`).
2. Keep the secret key on the server. Add your credentials to ignored local environment files, never Git:
   - Set `STRIPE_SERVER_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `AUTH_ACCESS_TOKEN_SECRET`, and your MongoDB Atlas `MONGODB_URI` in `server/.env`. Generate the auth secret with `openssl rand -base64 48`; never reuse the Stripe secret. Keep real values in `server/.env`; it is ignored by Git.
   - Add active products and one-time prices in the Stripe Dashboard. The **Stripe products** tab shows products that have an active one-time price.
   - If needed, create the workspace-root `.env.local` and put `STRIPE_PUBLISHABLE_KEY=pk_test_...` there. Vite exposes only this publishable key to the browser; it never exposes the server secret key.
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

The server defaults to port `3000` and allows the local client and `https://stripe-subscription-black.vercel.app`. Add other allowed frontend origins as a comma-separated list in `CLIENT_URL` in `server/.env` or Render's environment settings. The client API address can be overridden with `VITE_API_URL`.

## API

- `GET /health` — returns `{ "status": "ok" }`.
- `GET /products/demo` — returns the hardcoded demo catalog.
- `GET /products` — returns active Stripe products with active one-time prices.
- `POST /create-payment-intent` — accepts either a server catalog `productId` with `source: "demo"` or a Stripe `priceId` with `source: "stripe"`. Demo prices come from the backend; Stripe prices are verified with Stripe. Client-provided amounts are never trusted.
- `POST /webhooks/stripe` — accepts Stripe-signed webhook events, updates purchase status, and records each event once.
- `POST /auth/register` — accepts `{ "email": "...", "password": "..." }`; passwords must be 12–128 characters. Duplicate and successful registrations return the same neutral response.
- `POST /auth/login` — checks credentials, sets an HttpOnly refresh-token cookie, and returns a short-lived bearer access token.
- `POST /auth/refresh` — rotates the refresh token and returns a new access token. The browser must send credentials.
- `POST /auth/logout` and `POST /auth/logout-all` — revoke the current refresh session or all sessions for the signed-in user.
- `GET /auth/me` — returns the authenticated user's safe profile.
- `GET /auth/admin/users` — returns safe user fields to administrators only.
- `GET /purchases` — returns only purchases associated with the signed-in user.

Send `Authorization: Bearer <accessToken>` to protected endpoints. Registration never accepts a role; new accounts are customers. Promote the first administrator directly in MongoDB, for example `db.users.updateOne({ email: "admin@example.com" }, { $set: { role: "admin" } })`. Refresh sessions are stored as SHA-256 hashes and expire after 30 days; access tokens expire after 15 minutes. Login and registration endpoints are rate-limited.

The refresh cookie is `HttpOnly`, `Secure`, and `SameSite=None` in production. Cross-site cookies may be blocked by browser privacy settings when the Vercel frontend and Render API use unrelated domains. For reliable browser sessions, use a same-site custom domain or same-origin API proxy, and list the exact frontend origin in `CLIENT_URL`. Never put the access token or refresh token in local storage.

The product catalogs remain public. Payment-intent creation and purchase history require a signed-in user. The Stripe webhook remains unauthenticated by browser tokens and relies on Stripe signature verification. Purchases are attributed to the user from signed webhook metadata.

Each new checkout attempt creates a new PaymentIntent. Payment submission is locked while confirmation is in progress; after a completed or failed attempt, the UI requires a new PaymentIntent before another confirmation.

MongoDB uses two collections: `purchases` contains completed purchases only; a purchase is created or updated when Stripe sends the verified `payment_intent.succeeded` webhook. `paymentlogs` stores each Stripe event, including pending, success, processing, failure, and cancellation, with its event ID, outcome, and related purchase ID when one exists. Stripe event IDs are unique so webhook retries do not create duplicate logs. Configure the Stripe webhook endpoint to send `payment_intent.created`, `payment_intent.processing`, `payment_intent.succeeded`, `payment_intent.payment_failed`, and `payment_intent.canceled` events. Backend files are split by job: `server/index.js` starts the server, `server/src/config/database.js` connects to MongoDB, `server/src/models/` defines both collections, `server/src/routes/` handles HTTP requests, and `server/src/services/` contains the Stripe and webhook logic.

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
