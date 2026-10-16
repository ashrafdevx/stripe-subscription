const AuthSession = require('../models/AuthSession');
const User = require('../models/User');
const { verifyAccessToken } = require('../services/tokenService');

function unauthorized(res) {
  res.set('WWW-Authenticate', 'Bearer');
  return res.status(401).json({ error: 'Authentication required.' });
}

async function requireAuth(req, res, next) {
  const authorization = req.get('authorization') || '';
  const match = /^Bearer ([A-Za-z0-9._~-]+)$/.exec(authorization);
  if (!match) {
    return unauthorized(res);
  }

  let claims;
  try {
    claims = verifyAccessToken(match[1]);
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return unauthorized(res);
    }
    return next(error);
  }

  if (typeof claims.sub !== 'string' || typeof claims.jti !== 'string') {
    return unauthorized(res);
  }

  try {
    const [session, user] = await Promise.all([
      AuthSession.exists({
        _id: claims.jti,
        user: claims.sub,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      }),
      User.findById(claims.sub).select('_id email role isActive'),
    ]);

    if (!session || !user || user.isActive === false) {
      return unauthorized(res);
    }

    req.auth = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId: claims.jti,
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.auth) {
      return unauthorized(res);
    }
    if (!allowedRoles.includes(req.auth.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
