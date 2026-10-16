const express = require('express');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { requireAuth, requireRole } = require('../middleware/requireAuth');
const authService = require('../services/authService');
const sessionService = require('../services/sessionService');
const { ACCESS_TOKEN_TTL_SECONDS } = require('../services/tokenService');
const { isAllowedClientOrigin } = require('../config/clientOrigins');

const REFRESH_COOKIE = 'refreshToken';
const REFRESH_COOKIE_MAX_AGE_MS = sessionService.REFRESH_SESSION_TTL_MS;
const registrationResponse = {
  message: 'If an account can be created, you can now sign in.',
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Try again later.' },
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Try again later.' },
});

function logAuthError(operation, error) {
  console.error(`Authentication ${operation} failed:`, {
    name: error.name,
    code: error.code,
  });
}

function refreshCookieOptions() {
  const production = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: production,
    sameSite: production ? 'None' : 'Lax',
    path: '/auth',
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  };
}

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, refreshCookieOptions());
}

function clearRefreshCookie(res) {
  const { maxAge: _maxAge, ...options } = refreshCookieOptions();
  res.clearCookie(REFRESH_COOKIE, options);
}

function readRefreshCookie(req) {
  const prefix = `${REFRESH_COOKIE}=`;
  const cookie = (req.get('cookie') || '')
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix));

  return cookie ? cookie.slice(prefix.length) : '';
}

function hasTrustedOrigin(req, res) {
  const origin = req.get('origin');
  if (!origin || isAllowedClientOrigin(origin)) {
    return true;
  }

  res.status(403).json({ error: 'Request origin is not allowed.' });
  return false;
}

function createAuthRouter({
  service = authService,
  sessions = sessionService,
  userModel = User,
  authMiddleware = requireAuth,
  roleMiddleware = requireRole,
} = {}) {
  const router = express.Router();

  router.post('/register', registrationLimiter, async (req, res) => {
    if (!hasTrustedOrigin(req, res)) {
      return;
    }

    try {
      await service.registerUser(req.body);
      return res.status(202).json(registrationResponse);
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({ error: error.message });
      }

      logAuthError('registration', error);
      return res.status(500).json({ error: 'Could not process registration.' });
    }
  });

  router.post('/login', loginLimiter, async (req, res) => {
    if (!hasTrustedOrigin(req, res)) {
      return;
    }

    try {
      const user = await service.loginUser(req.body);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const session = await service.startUserSession(user);
      setRefreshCookie(res, session.refreshToken);
      return res.status(200).json({
        accessToken: session.accessToken,
        tokenType: 'Bearer',
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
        user: session.user,
      });
    } catch (error) {
      logAuthError('login', error);
      return res.status(500).json({ error: 'Could not process login.' });
    }
  });

  router.post('/refresh', loginLimiter, async (req, res) => {
    if (!hasTrustedOrigin(req, res)) {
      return;
    }

    try {
      const session = await service.refreshUserSession(readRefreshCookie(req));
      if (!session) {
        clearRefreshCookie(res);
        return res.status(401).json({ error: 'Authentication required.' });
      }

      setRefreshCookie(res, session.refreshToken);
      return res.status(200).json({
        accessToken: session.accessToken,
        tokenType: 'Bearer',
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
        user: session.user,
      });
    } catch (error) {
      logAuthError('refresh', error);
      return res.status(500).json({ error: 'Could not refresh the session.' });
    }
  });

  router.post('/logout', async (req, res) => {
    if (!hasTrustedOrigin(req, res)) {
      return;
    }

    try {
      await sessions.revokeSession(readRefreshCookie(req));
      clearRefreshCookie(res);
      return res.status(204).end();
    } catch (error) {
      logAuthError('logout', error);
      return res.status(500).json({ error: 'Could not end the session.' });
    }
  });

  router.post('/logout-all', authMiddleware, async (req, res) => {
    try {
      await sessions.revokeUserSessions(req.auth.userId);
      clearRefreshCookie(res);
      return res.status(204).end();
    } catch (error) {
      logAuthError('logout all', error);
      return res.status(500).json({ error: 'Could not end all sessions.' });
    }
  });

  router.get('/me', authMiddleware, (req, res) => {
    res.json({
      user: {
        id: req.auth.userId,
        email: req.auth.email,
        role: req.auth.role,
      },
    });
  });

  router.get('/admin/users', authMiddleware, roleMiddleware('admin'), async (_req, res, next) => {
    try {
      const users = await userModel.find()
        .select('_id email role createdAt')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      return res.json({
        users: users.map((user) => ({
          id: user._id.toString(),
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        })),
      });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = createAuthRouter;
