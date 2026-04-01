'use strict';
const logger = require('../utils/logger');

/**
 * Global error handler — must be registered LAST (after all routes).
 * Express recognises it as an error handler because of the 4-arg signature.
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Sanitize body for logging — remove passwords
  const safeBody = req.body ? { ...req.body } : {};
  delete safeBody.password;
  delete safeBody.password_hash;
  delete safeBody.currentPassword;
  delete safeBody.newPassword;

  logger.error(`${req.method} ${req.url} — ${err.message}`, {
    stack: err.stack,
    status: err.status || err.statusCode || 500,
    body: JSON.stringify(safeBody).slice(0, 200),
  });

  // Already sent a response (e.g. from streaming) — can't send again
  if (res.headersSent) return next(err);

  // express-validator validation errors
  if (err.type === 'validation') {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: err.errors });
  }

  // PostgreSQL: unique constraint violation
  if (err.code === '23505') {
    return res.status(409).json({ success: false, message: 'Resource already exists (duplicate)' });
  }

  // PostgreSQL: foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({ success: false, message: 'Referenced resource does not exist' });
  }

  // PostgreSQL: check constraint violation
  if (err.code === '23514') {
    return res.status(400).json({ success: false, message: 'Invalid value for field' });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  // CORS error
  if (err.message && err.message.startsWith('CORS')) {
    return res.status(403).json({ success: false, message: err.message });
  }

  // Payload too large
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request payload too large' });
  }

  const status  = err.status || err.statusCode || 500;
  // SECURITY: Never leak internal stack traces in production
  const message = (process.env.NODE_ENV === 'production' && status >= 500)
    ? 'Internal server error'
    : (err.message || 'Internal server error');

  return res.status(status).json({ success: false, message });
}

function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`,
  });
}

module.exports = { errorHandler, notFoundHandler };
