const argon2 = require('argon2');

function requireNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
}

async function hashPassword(password) {
  requireNonEmptyString(password, 'Password');
  return argon2.hash(password, { type: argon2.argon2id });
}

async function verifyPassword(password, passwordHash) {
  requireNonEmptyString(password, 'Password');
  requireNonEmptyString(passwordHash, 'Password hash');
  return argon2.verify(passwordHash, password);
}

module.exports = { hashPassword, verifyPassword };
