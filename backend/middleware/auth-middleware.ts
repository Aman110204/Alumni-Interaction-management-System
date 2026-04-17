/**
 * middleware/auth-middleware.ts
 *
 * JWT authentication + RBAC middleware.
 *
 * Updated to use assertSameTenant() from lib/tenant.ts for cross-tenant
 * enforcement. The logic is identical to the original but now delegates
 * the subdomain<->token college comparison to the shared utility so
 * there is no duplicated enforcement logic across the codebase.
 */

import { Request, Response, NextFunction } from 'express';
import { JwtPayload, verifyToken } from '../utils/jwt';
import { unauthorized, forbidden } from '../utils/response';
import logger from '../utils/logger';
import { tenantService } from '../services/tenant-service';
import { assertSameTenant } from '../lib/tenant';

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
  college_id: string;
  tenant: {
    college_id: string | null;
    source: string | null;
    hostname_tenant: string | null;
    token_tenant: string | null;
    is_localhost: boolean;
  };
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader =
    req.headers['authorization'] || (req.headers['Authorization'] as string);
  if (!authHeader || !String(authHeader).startsWith('Bearer ')) {
    unauthorized(res, 'No authentication token provided');
    return;
  }

  const token = String(authHeader).slice(7).trim();
  if (!token) {
    unauthorized(res, 'No authentication token provided');
    return;
  }

  try {
    const decoded = verifyToken(token);
    if (!decoded.id || !decoded.role) {
      unauthorized(res, 'Invalid token payload');
      return;
    }

    // Hydrate college_id from DB if not in token (backward-compat)
    if (!decoded.college_id && ['student', 'alumni', 'admin'].includes(decoded.role)) {
      decoded.college_id = await tenantService.getUserCollegeId(decoded.role, decoded.id);
    }

    // ── Tenant enforcement ──────────────────────────────────────────────────
    // assertSameTenant() throws HTTP 403 when the token's college != subdomain's college.
    // We catch it here to keep the response uniform.
    const hostnameTenant = (req as AuthenticatedRequest).tenant?.hostname_tenant;
    try {
      assertSameTenant(decoded.college_id, hostnameTenant ?? undefined);
    } catch (tenantErr: unknown) {
      const err = tenantErr as Error & { status?: number };
      logger.warn(
        `Tenant mismatch: token=${decoded.college_id} host=${hostnameTenant} ${req.method} ${req.url}`,
      );
      forbidden(res, err.message || 'Token tenant does not match subdomain');
      return;
    }

    // Propagate college_id onto the request if not already set by tenant middleware
    if (!(req as AuthenticatedRequest).college_id && decoded.college_id) {
      (req as AuthenticatedRequest).college_id = decoded.college_id;
      (req as AuthenticatedRequest).tenant = {
        ...((req as AuthenticatedRequest).tenant || {}),
        college_id: decoded.college_id,
        source: (req as AuthenticatedRequest).tenant?.source || 'token',
        token_tenant: decoded.college_id,
      } as AuthenticatedRequest['tenant'];
    }

    (req as AuthenticatedRequest).user = decoded;
    next();
  } catch (err: unknown) {
    const error = err as Error & { name?: string };
    logger.warn(`JWT rejected: ${error.message} — ${req.method} ${req.url}`);
    if (error.name === 'TokenExpiredError') {
      unauthorized(res, 'Token has expired. Please log in again.');
      return;
    }
    unauthorized(res, 'Invalid or expired token');
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      unauthorized(res);
      return;
    }
    if (!roles.includes(authReq.user.role)) {
      logger.warn(
        `RBAC denied: user ${authReq.user.id} (${authReq.user.role}) tried ${req.method} ${req.url} — requires: ${roles.join('|')}`,
      );
      forbidden(res, `This endpoint requires role: ${roles.join(' or ')}`);
      return;
    }
    next();
  };
}

export function requireOwnerOrAdmin(req: Request, res: Response, next: NextFunction): void {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user) {
    unauthorized(res);
    return;
  }
  if (authReq.user.role === 'admin') {
    next();
    return;
  }
  const resourceId = parseInt(req.params.id || req.params.userId, 10);
  if (authReq.user.id !== resourceId) {
    forbidden(res, 'You can only access your own resources');
    return;
  }
  next();
}

export const requireStudent = [authenticate, requireRole('student')];
export const requireAlumni  = [authenticate, requireRole('alumni')];
export const requireAdmin   = [authenticate, requireRole('admin')];
export const requireAuth    = [authenticate];
