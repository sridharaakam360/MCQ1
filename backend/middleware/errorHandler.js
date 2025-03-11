const logger = require('../config/logger');
const { ApiError } = require('../utils/errors');

const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
    user: req.user ? req.user.id : null
  });

  // Default error
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors || null;

  // Handle specific error types
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    errors = Object.values(err.errors).map(e => e.message);
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  } else if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 400;
    message = 'Duplicate entry';
    // Extract the duplicate field from the error message
    const field = err.message.match(/key '(.+)'/)?.[1] || 'field';
    errors = [`${field} already exists`];
  }

  // Send appropriate response based on environment
  const response = {
    success: false,
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      detail: err.message
    })
  };

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
