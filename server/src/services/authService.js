const User = require('../models/User');
const { hashPassword, verifyPassword } = require('./passwordService');
const sessions = require('./sessionService');
const { issueAccessToken } = require('./tokenService');

const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;
const MAX_EMAIL_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DUMMY_PASSWORD_HASH = '$argon2id$v=19$m=65536,p=4,t=3$TvITLd4C/PjL1oxplGM27g$wNik1rWUGe0HEc3tB6K7LS16XWFivVntppWbARmFgAY';

class AuthInputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthInputError';
    this.statusCode = 400;
  }
}

function normalizeEmail(email) {
  if (typeof email !== 'string') {
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (
    normalizedEmail.length > MAX_EMAIL_LENGTH
    || !EMAIL_PATTERN.test(normalizedEmail)
  ) {
    return null;
  }

  return normalizedEmail;
}

function passwordLength(password) {
  return Array.from(password).length;
}

function isDuplicateEmailError(error) {
  return error.code === 11000
    && (error.keyPattern?.email === 1 || typeof error.keyValue?.email === 'string');
}

async function registerUser(credentials = {}, {
  userModel = User,
  passwordHasher = hashPassword,
} = {}) {
  const email = normalizeEmail(credentials?.email);
  const password = credentials?.password;

  if (!email) {
    throw new AuthInputError('Enter a valid email address.');
  }
  if (typeof password !== 'string' || passwordLength(password) < MIN_PASSWORD_LENGTH) {
    throw new AuthInputError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (passwordLength(password) > MAX_PASSWORD_LENGTH) {
    throw new AuthInputError(`Password must be no more than ${MAX_PASSWORD_LENGTH} characters.`);
  }

  const passwordHash = await passwordHasher(password);

  try {
    await userModel.create({ email, passwordHash });
  } catch (error) {
    if (isDuplicateEmailError(error)) {
      return;
    }
    throw error;
  }
}

async function loginUser(credentials = {}, {
  userModel = User,
  passwordVerifier = verifyPassword,
} = {}) {
  const email = normalizeEmail(credentials?.email);
  const password = credentials?.password;

  if (
    !email
    || typeof password !== 'string'
    || password.length === 0
    || passwordLength(password) > MAX_PASSWORD_LENGTH
  ) {
    return null;
  }

  const user = await userModel.findOne({ email }).select('+passwordHash');
  const matches = await passwordVerifier(password, user?.passwordHash || DUMMY_PASSWORD_HASH);
  if (!user || !matches || user.isActive === false) {
    return null;
  }

  return user;
}

async function startUserSession(user, {
  sessionService = sessions,
  tokenIssuer = issueAccessToken,
} = {}) {
  const { session, refreshToken } = await sessionService.createSession(user.id);
  return {
    accessToken: tokenIssuer({ userId: user.id, sessionId: session.id }),
    refreshToken,
    user: { id: user.id, email: user.email, role: user.role },
  };
}

async function refreshUserSession(refreshToken, {
  sessionService = sessions,
  tokenIssuer = issueAccessToken,
} = {}) {
  const rotated = await sessionService.rotateSession(refreshToken);
  if (!rotated) {
    return null;
  }

  return {
    accessToken: tokenIssuer({
      userId: rotated.session.user.id,
      sessionId: rotated.session.id,
    }),
    refreshToken: rotated.refreshToken,
    user: {
      id: rotated.session.user.id,
      email: rotated.session.user.email,
      role: rotated.session.user.role,
    },
  };
}

module.exports = {
  AuthInputError,
  loginUser,
  refreshUserSession,
  registerUser,
  startUserSession,
};
