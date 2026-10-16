const assert = require('node:assert/strict');
const { test } = require('node:test');
const AuthSession = require('../src/models/AuthSession');
const User = require('../src/models/User');
process.env.AUTH_ACCESS_TOKEN_SECRET = 'unit-test-secret-that-is-at-least-32-bytes-long';
const { issueAccessToken } = require('../src/services/tokenService');
const { requireAuth, requireRole } = require('../src/middleware/requireAuth');

function responseMock() {
  return {
    statusCode: 200,
    headers: {},
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('authentication middleware rejects missing and malformed bearer tokens', async () => {
  for (const authorization of ['', 'Basic abc', 'Bearer malformed']) {
    const req = { get: () => authorization };
    const res = responseMock();
    let nextCalled = false;

    await requireAuth(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 401);
    assert.equal(res.headers['WWW-Authenticate'], 'Bearer');
    assert.equal(nextCalled, false);
  }
});

test('authentication middleware accepts a valid token only for an active user session', async () => {
  const originalExists = AuthSession.exists;
  const originalFindById = User.findById;
  AuthSession.exists = async () => true;
  User.findById = () => ({
    select: async () => ({
      id: 'user-1',
      email: 'user@example.com',
      role: 'customer',
      isActive: true,
    }),
  });

  try {
    const token = issueAccessToken({ userId: 'user-1', sessionId: 'session-1' });
    const req = { get: () => `Bearer ${token}` };
    const res = responseMock();
    let nextCalled = false;

    await requireAuth(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, true);
    assert.deepEqual(req.auth, {
      userId: 'user-1',
      email: 'user@example.com',
      role: 'customer',
      sessionId: 'session-1',
    });
  } finally {
    AuthSession.exists = originalExists;
    User.findById = originalFindById;
  }
});

test('role middleware returns 401 without an authenticated principal and 403 for insufficient role', () => {
  const unauthorizedResponse = responseMock();
  requireRole('admin')({}, unauthorizedResponse, () => {});
  assert.equal(unauthorizedResponse.statusCode, 401);

  const forbiddenResponse = responseMock();
  requireRole('admin')({ auth: { role: 'customer' } }, forbiddenResponse, () => {});
  assert.equal(forbiddenResponse.statusCode, 403);
});
