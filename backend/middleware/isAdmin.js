const db = require('../config/db');
const logger = require('../config/logger'); // Assuming a logger module is available
const { ApiError } = require('../utils/errors');
const cache = require('../config/cache');

const isAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401);
    }

    // Check if isAdmin is already in the token
    if (req.user.isAdmin) {
      req.isAdmin = true;
      return next();
    }

    // Try to get admin status from cache
    const userId = req.user.id || req.user.userId;
    const cacheKey = `user:${userId}:isAdmin`;
    let isAdminStatus = await cache.get(cacheKey);

    if (isAdminStatus === null) {
      // Not in cache, check database
      const [users] = await db.query(
        'SELECT is_admin FROM users WHERE id = ? AND is_active = true',
        [userId]
      );

      if (!users || users.length === 0) {
        throw new ApiError('User not found or inactive', 401);
      }

      isAdminStatus = users[0].is_admin;

      // Cache the result for 5 minutes
      await cache.set(cacheKey, isAdminStatus, 300);
    }

    if (!isAdminStatus) {
      logger.warn('Unauthorized admin access attempt', {
        userId,
        path: req.path,
        method: req.method
      });
      throw new ApiError('Admin privileges required', 403);
    }

    // Add admin flag to request for use in controllers
    req.isAdmin = true;
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else {
      logger.error('Error in isAdmin middleware:', error);
      next(new ApiError('Internal server error', 500));
    }
  }
};

module.exports = isAdmin;
