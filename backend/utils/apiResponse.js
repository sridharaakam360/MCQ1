/**
 * Utility class for standardized API responses
 */
class ApiResponse {
  /**
   * Send a success response
   * @param {Object} res - Express response object
   * @param {string} message - Success message
   * @param {*} data - Response data
   * @param {number} statusCode - HTTP status code (default: 200)
   */
  success(res, message, data = null, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data
    });
  }

  /**
   * Send an error response
   * @param {Object} res - Express response object
   * @param {Object} options - Error options
   * @param {number} options.statusCode - HTTP status code
   * @param {string} options.status - Error status
   * @param {string} options.message - Error message
   * @param {Object} [options.stack] - Error stack trace (development only)
   */
  error(res, { statusCode = 500, status = 'error', message = 'Internal Server Error', stack = null }) {
    const response = {
      success: false,
      status,
      message
    };

    if (process.env.NODE_ENV === 'development' && stack) {
      response.stack = stack;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Send a not found response
   * @param {Object} res - Express response object
   * @param {string} message - Not found message
   */
  notFound(res, message = 'Resource not found') {
    return this.error(res, {
      statusCode: 404,
      status: 'not_found',
      message
    });
  }

  /**
   * Send an unauthorized response
   * @param {Object} res - Express response object
   * @param {string} message - Unauthorized message
   */
  unauthorized(res, message = 'Unauthorized access') {
    return this.error(res, {
      statusCode: 401,
      status: 'unauthorized',
      message
    });
  }

  /**
   * Send a forbidden response
   * @param {Object} res - Express response object
   * @param {string} message - Forbidden message
   */
  forbidden(res, message = 'Forbidden access') {
    return this.error(res, {
      statusCode: 403,
      status: 'forbidden',
      message
    });
  }

  /**
   * Send a validation error response
   * @param {Object} res - Express response object
   * @param {string} message - Validation error message
   * @param {Object} errors - Validation errors object
   */
  validationError(res, message = 'Validation failed', errors = null) {
    return this.error(res, {
      statusCode: 422,
      status: 'validation_error',
      message,
      stack: errors
    });
  }
}

module.exports = new ApiResponse();
