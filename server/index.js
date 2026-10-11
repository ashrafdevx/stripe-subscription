
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const connectDatabase = require('./src/config/database');
const app = require('./src/app');

const port = process.env.PORT || 3000;

// Validate required environment variables
const requiredEnvVars = [
  'STRIPE_SERVER_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'MONGODB_URI',
];

const missingEnvVars = requiredEnvVars.filter(
  (key) => !process.env[key]
);

if (missingEnvVars.length > 0) {
  console.error(
    `Missing required environment variables: ${missingEnvVars.join(', ')}`
  );
  console.error(
    'Configure these variables in Render Dashboard > Environment.'
  );
  process.exit(1);
}

async function startServer() {
  try {
    console.log('Connecting to MongoDB...');

    await connectDatabase();

    console.log('MongoDB connected successfully.');

    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`Backend running on port ${port}`);
    });

    server.on('error', (error) => {
      console.error('HTTP server error:', error);
      process.exit(1);
    });
  } catch (error) {
    console.error('Backend startup failed:', error.message);

    if (error.cause) {
      console.error('Underlying error:', error.cause.message);
    }

    process.exit(1);
  }
}

startServer();
