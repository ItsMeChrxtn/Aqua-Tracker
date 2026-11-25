class ApiError extends Error {
  // `errorCode` is a machine-readable reason the client can branch on
  // (e.g. EMAIL_NOT_VERIFIED); `extra` is merged into the JSON response.
  constructor(statusCode, message, errorCode, extra) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.extra = extra;
  }
}

function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Server error';

  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ID: ${err.value}`;
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  }

  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = `${field ? field : 'Value'} already in use`;
  }

  if (err.name === 'MulterError') {
    statusCode = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 10 MB)' : err.message;
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Not authorized, invalid or expired token';
  }

  if (statusCode >= 500) console.error(err);

  // Stack traces only when explicitly running in development, so a server
  // deployed without NODE_ENV does not reveal its code paths.
  res.status(statusCode).json({
    success: false,
    message,
    code: err.errorCode,
    ...err.extra,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}

module.exports = { ApiError, notFound, errorHandler };
