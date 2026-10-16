const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createSession, rotateSession } = require('../src/services/sessionService');

test('stores only a hash of the generated refresh token', async () => {
  let persisted;
  const sessionModel = {
    create: async (session) => {
      persisted = session;
      return { id: 'session-1', ...session };
    },
  };

  const { session, refreshToken } = await createSession('user-1', { sessionModel });

  assert.match(refreshToken, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(persisted.tokenHash, refreshToken);
  assert.match(persisted.tokenHash, /^[a-f0-9]{64}$/);
  assert.equal(session.id, 'session-1');
});

test('refresh rotation atomically replaces the old token hash', async () => {
  const oldToken = 'A'.repeat(43);
  let query;
  let update;
  const sessionModel = {
    findOneAndUpdate: (filter, operation) => {
      query = filter;
      update = operation;
      return {
        populate: async () => ({
          id: 'session-1',
          user: { id: 'user-1', isActive: true },
        }),
      };
    },
  };

  const rotated = await rotateSession(oldToken, { sessionModel });

  assert.equal(query.tokenHash.length, 64);
  assert.equal(query.revokedAt, null);
  assert.ok(query.expiresAt.$gt instanceof Date);
  assert.equal(update.$set.tokenHash.length, 64);
  assert.notEqual(update.$set.tokenHash, query.tokenHash);
  assert.match(rotated.refreshToken, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(rotated.session.id, 'session-1');
});

test('rejects malformed refresh tokens without querying the session store', async () => {
  let queried = false;
  const result = await rotateSession('malformed', {
    sessionModel: {
      findOneAndUpdate: () => { queried = true; },
    },
  });

  assert.equal(result, null);
  assert.equal(queried, false);
});
