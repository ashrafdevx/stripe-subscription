const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { test } = require('node:test');

process.env.AUTH_ACCESS_TOKEN_SECRET = 'unit-test-secret-that-is-at-least-32-bytes-long';
const { issueAccessToken, verifyAccessToken } = require('../src/services/tokenService');

test('access tokens are signed and verified with the configured issuer, audience, and claims', () => {
  const token = issueAccessToken({ userId: 'user-1', sessionId: 'session-1' });
  const claims = verifyAccessToken(token);

  assert.equal(claims.sub, 'user-1');
  assert.equal(claims.jti, 'session-1');
  assert.equal(claims.iss, 'stripe-subscription-api');
  assert.equal(claims.aud, 'stripe-subscription-client');
  assert.ok(claims.exp > claims.iat);
});

test('access token verification rejects expired and tampered tokens', () => {
  const expiredToken = jwt.sign(
    { sub: 'user-1', jti: 'session-1' },
    process.env.AUTH_ACCESS_TOKEN_SECRET,
    {
      algorithm: 'HS256',
      issuer: 'stripe-subscription-api',
      audience: 'stripe-subscription-client',
      expiresIn: -1,
    },
  );
  const validToken = issueAccessToken({ userId: 'user-1', sessionId: 'session-1' });

  assert.throws(() => verifyAccessToken(expiredToken), { name: 'TokenExpiredError' });
  assert.throws(() => verifyAccessToken(`${validToken}tampered`), { name: 'JsonWebTokenError' });
});

test('token signing refuses a missing or weak secret', () => {
  const secret = process.env.AUTH_ACCESS_TOKEN_SECRET;
  process.env.AUTH_ACCESS_TOKEN_SECRET = 'short';
  try {
    assert.throws(
      () => issueAccessToken({ userId: 'user-1', sessionId: 'session-1' }),
      /at least 32 bytes/,
    );
  } finally {
    process.env.AUTH_ACCESS_TOKEN_SECRET = secret;
  }
});
