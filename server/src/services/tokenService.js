const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const TOKEN_ISSUER = 'stripe-subscription-api';
const TOKEN_AUDIENCE = 'stripe-subscription-client';

function getSigningSecret() {
  const secret = process.env.AUTH_ACCESS_TOKEN_SECRET;
  if (typeof secret !== 'string' || Buffer.byteLength(secret) < 32) {
    throw new Error('AUTH_ACCESS_TOKEN_SECRET must contain at least 32 bytes.');
  }
  return secret;
}

function issueAccessToken({ userId, sessionId }) {
  return jwt.sign(
    {},
    getSigningSecret(),
    {
      algorithm: 'HS256',
      subject: userId.toString(),
      jwtid: sessionId.toString(),
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    },
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, getSigningSecret(), {
    algorithms: ['HS256'],
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
  });
}

module.exports = { ACCESS_TOKEN_TTL_SECONDS, issueAccessToken, verifyAccessToken };
