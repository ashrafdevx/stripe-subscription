const assert = require('node:assert/strict');
const { test } = require('node:test');
const User = require('../src/models/User');

test('normalizes email and accepts a user with a password hash', async () => {
  const user = new User({
    email: '  USER@Example.COM ',
    passwordHash: 'hashed-password',
  });

  assert.equal(user.email, 'user@example.com');
  await user.validate();
});

test('requires email and password hash', async () => {
  await assert.rejects(new User().validate(), (error) => {
    assert.ok(error.errors.email);
    assert.ok(error.errors.passwordHash);
    return true;
  });
});

test('defines a unique email index and excludes password hashes from default queries', () => {
  const emailIndex = User.schema.indexes().find(([fields]) => fields.email === 1);

  assert.deepEqual(emailIndex, [{ email: 1 }, { unique: true }]);
  assert.equal(User.schema.path('passwordHash').options.select, false);
});
