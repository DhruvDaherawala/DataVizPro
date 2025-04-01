/**
 * Custom error response class
 * Extends the built-in Error class with a statusCode property
 */
class ErrorResponse extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = ErrorResponse; 