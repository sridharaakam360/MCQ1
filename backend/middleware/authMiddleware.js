const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { ApiError } = require('../utils/errors');
const logger = require('../config/logger');
const cache = require('../config/cache');
const db = require('../config/db').pool;

const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
};

const protect = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new ApiError('Authentication token is required', 401);
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new ApiError('Invalid token', 401));
    } else if (error.name === 'TokenExpiredError') {
      next(new ApiError('Token has expired', 401));
    } else {
      next(error);
    }
  }
};

const authorizeAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    next(new ApiError('Admin access required', 403));
    return;
  }
  next();
};

module.exports = {
  protect,
  authorizeAdmin
};