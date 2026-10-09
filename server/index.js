const path = require('node:path');

require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

if (!process.env.STRIPE_SERVER_SECRET_KEY) {
  console.error('Missing STRIPE_SERVER_SECRET_KEY. Add your Stripe test secret key to server/.env.');
  process.exit(1);
}

const app = require('./src/app');
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
