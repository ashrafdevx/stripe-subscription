const clientOrigins = new Set([
  'http://localhost:5173',
  'https://stripe-subscription-black.vercel.app',
  ...(process.env.CLIENT_URL || '').split(','),
].map((url) => url.trim().replace(/\/+$/, '')).filter(Boolean));

function isAllowedClientOrigin(origin) {
  return clientOrigins.has(origin.replace(/\/+$/, ''));
}

module.exports = { clientOrigins, isAllowedClientOrigin };
