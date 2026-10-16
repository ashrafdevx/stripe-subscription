const { createHash, randomBytes } = require('node:crypto');
const AuthSession = require('../models/AuthSession');

const REFRESH_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const REFRESH_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function createRefreshToken() {
  return randomBytes(32).toString('base64url');
}

function hashRefreshToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function isRefreshToken(token) {
  return typeof token === 'string' && REFRESH_TOKEN_PATTERN.test(token);
}

async function createSession(userId, { sessionModel = AuthSession } = {}) {
  const refreshToken = createRefreshToken();
  const session = await sessionModel.create({
    user: userId,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: new Date(Date.now() + REFRESH_SESSION_TTL_MS),
  });

  return { session, refreshToken };
}

async function rotateSession(refreshToken, { sessionModel = AuthSession } = {}) {
  if (!isRefreshToken(refreshToken)) {
    return null;
  }

  const nextRefreshToken = createRefreshToken();
  const session = await sessionModel.findOneAndUpdate(
    {
      tokenHash: hashRefreshToken(refreshToken),
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    },
    { $set: { tokenHash: hashRefreshToken(nextRefreshToken) } },
    { new: true },
  ).populate('user');

  if (!session?.user || session.user.isActive === false) {
    return null;
  }

  return { session, refreshToken: nextRefreshToken };
}

async function revokeSession(refreshToken, { sessionModel = AuthSession } = {}) {
  if (!isRefreshToken(refreshToken)) {
    return;
  }

  await sessionModel.updateOne(
    {
      tokenHash: hashRefreshToken(refreshToken),
      revokedAt: null,
    },
    { $set: { revokedAt: new Date() } },
  );
}

async function revokeUserSessions(userId, { sessionModel = AuthSession } = {}) {
  await sessionModel.updateMany(
    { user: userId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

module.exports = {
  createSession,
  isRefreshToken,
  REFRESH_SESSION_TTL_MS,
  revokeSession,
  revokeUserSessions,
  rotateSession,
};
