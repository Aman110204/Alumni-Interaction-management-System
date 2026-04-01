'use strict';
const jwt    = require('jsonwebtoken');
const logger = require('./logger');

// SECURITY: Warn loudly if the fallback secret is still in use
const SECRET = process.env.JWT_SECRET;
if (!SECRET || SECRET.length < 32) {
  if (process.env.NODE_ENV === 'production') {
    logger.error('FATAL: JWT_SECRET is not set or too short for production. Exiting.');
    process.exit(1);
  }
  logger.warn('⚠️  JWT_SECRET is using a weak/default value. Set a strong 64+ char secret in .env');
}

const EFFECTIVE_SECRET = SECRET || 'fallback_only_for_dev_never_production_32chars_min';
const EXPIRES          = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Sign a JWT token with role-based payload.
 * Payload must include: { id, role, email }
 */
function signToken(payload) {
  return jwt.sign(payload, EFFECTIVE_SECRET, {
    expiresIn: EXPIRES,
    issuer: 'alumni-connect',
  });
}

/**
 * Verify and decode a JWT token.
 * Throws JsonWebTokenError or TokenExpiredError on failure.
 */
function verifyToken(token) {
  return jwt.verify(token, EFFECTIVE_SECRET, { issuer: 'alumni-connect' });
}

module.exports = { signToken, verifyToken };
