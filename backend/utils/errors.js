/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  } else {
    // Production error response
    if (err.isOperational) {
      // Operational, trusted error: send message to client
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    } else {
      // Programming or other unknown error: don't leak error details
      console.error('ERROR 💥', err);
      res.status(500).json({
        status: 'error',
        message: 'Something went wrong!'
      });
    }
  }
};

/**
 * Handle specific error types
 * @param {Error} err - Error object
 * @returns {ApiError} - Formatted API error
 */
const handleError = (err) => {
  if (err.code === 'ER_DUP_ENTRY') {
    return new ApiError('Duplicate field value entered', 400);
  }

  if (err.code === 'ER_NO_REFERENCED_ROW') {
    return new ApiError('Referenced record not found', 400);
  }

  if (err.name === 'ValidationError') {
    return new ApiError(err.message, 400);
  }

  if (err.name === 'JsonWebTokenError') {
    return new ApiError('Invalid token. Please log in again!', 401);
  }

  if (err.name === 'TokenExpiredError') {
    return new ApiError('Your token has expired! Please log in again.', 401);
  }

  return err;
};

/**
 * Not found error handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const notFound = (req, res, next) => {
  const err = new ApiError(`Can't find ${req.originalUrl} on this server!`, 404);
  next(err);
};

/**
 * Async error handler wrapper
 * @param {Function} fn - Async function to wrap
 * @returns {Function} - Wrapped function
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  ApiError,
  errorHandler,
  handleError,
  notFound,
  catchAsync
}; 