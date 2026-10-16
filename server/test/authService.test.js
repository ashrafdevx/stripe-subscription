const assert = require('node:assert/strict');
const { test } = require('node:test');
const { AuthInputError, loginUser, registerUser } = require('../src/services/authService');

test('registers a normalized email with a password hash and not the raw password', async () => {
  const createdUsers = [];
  let hashedPassword;
  const password = 'correct horse battery staple';

  await registerUser(
    { email: '  USER@Example.COM ', password },
    {
      userModel: {
        create: async (user) => createdUsers.push(user),
      },
      passwordHasher: async (value) => {
        hashedPassword = value;
        return 'encoded-argon2id-hash';
      },
    },
  );

  assert.equal(hashedPassword, password);
  assert.deepEqual(createdUsers, [{
    email: 'user@example.com',
    passwordHash: 'encoded-argon2id-hash',
  }]);
});

test('rejects invalid registration email and passwords outside the accepted bounds', async () => {
  const credentials = { email: 'user@example.com', password: 'short' };

  await assert.rejects(
    registerUser({ ...credentials, email: 'not-an-email' }),
    AuthInputError,
  );
  await assert.rejects(registerUser(credentials), AuthInputError);
  await assert.rejects(
    registerUser({ ...credentials, password: 'x'.repeat(129) }),
    AuthInputError,
  );
});

test('handles a duplicate email index error without returning an account-existence result', async () => {
  await assert.doesNotReject(registerUser(
    { email: 'user@example.com', password: 'correct horse battery staple' },
    {
      userModel: {
        create: async () => {
          const error = new Error('Duplicate email');
          error.code = 11000;
          error.keyPattern = { email: 1 };
          throw error;
        },
      },
      passwordHasher: async () => 'encoded-argon2id-hash',
    },
  ));
});

test('loads the hidden password hash and returns a user only for valid credentials', async () => {
  const calls = [];
  const user = { id: 'user-1', email: 'user@example.com', passwordHash: 'encoded-hash' };
  const userModel = {
    findOne: (filter) => {
      calls.push(['findOne', filter]);
      return {
        select: async (fields) => {
          calls.push(['select', fields]);
          return user;
        },
      };
    },
  };
  const passwordVerifier = async (password, passwordHash) => {
    calls.push(['verify', password, passwordHash]);
    return password === 'correct password';
  };

  assert.equal(
    await loginUser(
      { email: ' USER@example.com ', password: 'correct password' },
      { userModel, passwordVerifier },
    ),
    user,
  );
  assert.deepEqual(calls, [
    ['findOne', { email: 'user@example.com' }],
    ['select', '+passwordHash'],
    ['verify', 'correct password', 'encoded-hash'],
  ]);

  assert.equal(
    await loginUser(
      { email: 'user@example.com', password: 'wrong password' },
      { userModel, passwordVerifier },
    ),
    null,
  );
});

test('returns the same failed-login result for an unknown email and malformed credentials', async () => {
  let queryCount = 0;
  const userModel = {
    findOne: () => {
      queryCount += 1;
      return { select: async () => null };
    },
  };

  assert.equal(await loginUser({ email: 'missing@example.com', password: 'password' }, { userModel }), null);
  assert.equal(await loginUser({ email: 'not-an-email', password: 'password' }, { userModel }), null);
  assert.equal(queryCount, 1);
});
