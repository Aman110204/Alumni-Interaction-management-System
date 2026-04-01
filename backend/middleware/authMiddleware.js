'use strict';
const { verifyToken } = require('../utils/jwt');
const { unauthorized, forbidden } = require('../utils/response');
const logger = require('../utils/logger');
const { getUserCollegeId } = require('../services/tenantService');

/**
 * authenticate — verifies JWT from the Authorization header.
 * Attaches decoded payload as req.user: { id, role, email }.
 */
async function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(res, 'No authentication token provided');
  }

  const token = authHeader.slice(7).trim();
  if (!token) return unauthorized(res, 'No authentication token provided');

  try {
    const decoded = verifyToken(token);
    // Validate required fields exist in payload
    if (!decoded.id || !decoded.role) {
      return unauthorized(res, 'Invalid token payload');
    }
    if (!decoded.college_id && ['student', 'alumni', 'admin'].includes(decoded.role)) {
      decoded.college_id = await getUserCollegeId(decoded.role, decoded.id);
    }
    const hostnameTenant = req.tenant && req.tenant.hostname_tenant;
    if (hostnameTenant && decoded.college_id && hostnameTenant !== decoded.college_id) {
      logger.warn(`Tenant mismatch: token=${decoded.college_id} host=${hostnameTenant} ${req.method} ${req.url}`);
      return forbidden(res, 'Token tenant does not match subdomain');
    }
    if (!req.college_id && decoded.college_id) {
      req.college_id = decoded.college_id;
      req.tenant = {
        ...(req.tenant || {}),
        college_id: decoded.college_id,
        source: (req.tenant && req.tenant.source) || 'token',
        token_tenant: decoded.college_id,
      };
    }
    req.user = decoded;
    next();
  } catch (err) {
    logger.warn(`JWT rejected: ${err.message} — ${req.method} ${req.url}`);
    if (err.name === 'TokenExpiredError') {
      return unauthorized(res, 'Token has expired. Please log in again.');
    }
    return unauthorized(res, 'Invalid or expired token');
  }
}

/**
 * requireRole — returns middleware that enforces one or more allowed roles.
 * Must run AFTER authenticate.
 *
 * RBAC Rules:
 *   - Students: cannot access admin APIs, cannot post opportunities
 *   - Alumni:   can create opportunities, manage their own resources
 *   - Admin:    can moderate users, manage all resources
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return unauthorized(res);
    if (!roles.includes(req.user.role)) {
      logger.warn(`RBAC denied: user ${req.user.id} (${req.user.role}) tried to access ${req.method} ${req.url} — requires: ${roles.join('|')}`);
      return forbidden(res, `This endpoint requires role: ${roles.join(' or ')}`);
    }
    next();
  };
}

/**
 * requireOwnerOrAdmin — ensures user is accessing their own resource OR is admin.
 * Expects req.params.id or req.params.userId to be the resource owner ID.
 */
function requireOwnerOrAdmin(req, res, next) {
  if (!req.user) return unauthorized(res);
  if (req.user.role === 'admin') return next();
  const resourceId = parseInt(req.params.id || req.params.userId, 10);
  if (req.user.id !== resourceId) {
    return forbidden(res, 'You can only access your own resources');
  }
  next();
}

// ─── Convenience middleware arrays for route declarations ─────────────────────
const requireStudent = [authenticate, requireRole('student')];
const requireAlumni  = [authenticate, requireRole('alumni')];
const requireAdmin   = [authenticate, requireRole('admin')];
const requireAuth    = [authenticate];                        // any authenticated user

module.exports = {
  authenticate,
  requireRole,
  requireOwnerOrAdmin,
  requireStudent,
  requireAlumni,
  requireAdmin,
  requireAuth,
};
