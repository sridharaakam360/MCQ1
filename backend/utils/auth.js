const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { ApiError } = require('./errors');

/**
 * Generate access and refresh tokens
 * @param {Object} user - User object
 * @returns {Object} - Object containing access and refresh tokens
 */
const generateTokens = async (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    isAdmin: Boolean(user.is_admin)
  };

  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.accessExpirationMinutes,
    algorithm: 'HS256'
  });

  const refreshToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpirationDays,
    algorithm: 'HS256'
  });

  return {
    accessToken,
    refreshToken
  };
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} - Decoded token payload
 * @throws {ApiError} - If token is invalid or expired
 */
const verifyToken = async (token) => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new ApiError('Token has expired', 401);
    }
    throw new ApiError('Invalid token', 401);
  }
};

/**
 * Extract token from request
 * @param {Object} req - Express request object
 * @returns {string|null} - Token if found, null otherwise
 */
const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
};

/**
 * Authentication middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new ApiError('Authentication token is required', 401);
    }

    const decoded = await verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Admin authorization middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authorizeAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    next(new ApiError('Admin access required', 403));
    return;
  }
  next();
};

/**
 * Email verification middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requireVerified = (req, res, next) => {
  if (!req.user || !req.user.isVerified) {
    next(new ApiError('Email verification required', 403));
    return;
  }
  next();
};

module.exports = {
  generateTokens,
  verifyToken,
  extractToken,
  authenticate,
  authorizeAdmin,
  requireVerified
}; 