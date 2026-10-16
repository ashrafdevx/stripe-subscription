const assert = require('node:assert/strict');
const { test } = require('node:test');
const { hashPassword, verifyPassword } = require('../src/services/passwordService');

test('hashes passwords with Argon2id and verifies only the matching password', async () => {
  const password = 'correct horse battery staple';
  const passwordHash = await hashPassword(password);

  assert.match(passwordHash, /^\$argon2id\$/);
  assert.notEqual(passwordHash, password);
  assert.equal(await verifyPassword(password, passwordHash), true);
  assert.equal(await verifyPassword('incorrect password', passwordHash), false);
});

test('creates a distinct salted hash for the same password', async () => {
  const firstHash = await hashPassword('same password');
  const secondHash = await hashPassword('same password');

  assert.notEqual(firstHash, secondHash);
});

test('rejects empty and non-string passwords or password hashes', async () => {
  await assert.rejects(hashPassword(''), TypeError);
  await assert.rejects(hashPassword(null), TypeError);
  await assert.rejects(verifyPassword('', 'encoded-hash'), TypeError);
  await assert.rejects(verifyPassword('password', ''), TypeError);
  await assert.rejects(verifyPassword('password', null), TypeError);
});
