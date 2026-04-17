/**
 * middleware/tenant-middleware.ts
 *
 * Subdomain-based tenant context middleware.
 *
 * attachTenantContext() resolves the active college from:
 *   1. The subdomain in the Host header  (production / lvh.me dev)
 *   2. The authenticated user's JWT      (fallback when on localhost)
 *   3. x-college-id header / body / query param (localhost dev only)
 *
 * Cross-tenant access is always rejected: if a subdomain IS present and
 * the JWT points to a different college, the request is denied with 403.
 *
 * Uses lib/tenant.ts for the subdomain -> College resolution so the logic
 * is never duplicated across the codebase.
 */

import { Request, Response, NextFunction } from 'express';
import { tenantService } from '../services/tenant-service';
import { resolveTenantFromHost, assertSameTenant } from '../lib/tenant';
import { AuthenticatedRequest } from './auth-middleware';

export async function attachTenantContext(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rawHost =
      (req.headers['x-tenant-host'] as string) ||
      (req.headers['x-forwarded-host'] as string) ||
      (req.headers.host as string) ||
      req.hostname ||
      '';

    // ── 1. Resolve tenant from subdomain via the shared utility ─────────────
    const tenantCollege = await resolveTenantFromHost(rawHost);
    const fromHostname = tenantCollege?.id ?? null;
    const isLocalhost = !fromHostname;

    // ── 2. Determine the user's college (from JWT if already parsed) ─────────
    const fromUser = tenantService.normalizeCollegeId(
      (req as AuthenticatedRequest).user?.college_id,
    );

    // ── 3. localhost-only fallbacks (dev convenience) ────────────────────────
    const fromHeader = isLocalhost
      ? tenantService.normalizeCollegeId(req.headers['x-college-id'] as string)
      : null;
    const fromBody = isLocalhost
      ? tenantService.normalizeCollegeId((req.body as Record<string, string>)?.college_id)
      : null;
    const fromQuery = isLocalhost
      ? tenantService.normalizeCollegeId((req.query as Record<string, string>)?.college_id)
      : null;

    let collegeId: string | null = null;
    let source: string | null = null;

    if (fromHostname) {
      // Subdomain present — tenant is definitively resolved; validate it exists
      if (!tenantCollege) {
        res.status(404).json({ success: false, message: 'Unknown tenant subdomain' });
        return;
      }
      collegeId = tenantCollege.id;
      source = 'subdomain';
    } else {
      // No subdomain — pick best available fallback
      collegeId = fromUser || fromHeader || fromBody || fromQuery || null;
      source = fromUser
        ? 'token'
        : fromHeader
        ? 'header'
        : fromBody
        ? 'body'
        : fromQuery
        ? 'query'
        : null;

      if (collegeId) {
        const college = await tenantService.getCollegeById(collegeId);
        if (!college) {
          res.status(400).json({ success: false, message: 'Invalid college_id' });
          return;
        }
        collegeId = college.id;
      }
    }

    // ── 4. Cross-tenant guard ─────────────────────────────────────────────────
    // When subdomain IS present, the JWT must belong to the SAME college.
    if (fromHostname && fromUser && fromHostname !== fromUser) {
      res.status(403).json({ success: false, message: 'Cross-tenant access denied' });
      return;
    }

    // ── 5. Attach context to request ──────────────────────────────────────────
    (req as AuthenticatedRequest).college_id = collegeId as string;
    (req as AuthenticatedRequest).tenant = {
      college_id: collegeId,
      source,
      hostname_tenant: fromHostname,
      token_tenant: fromUser,
      is_localhost: isLocalhost,
    };

    next();
  } catch (err) {
    next(err);
  }
}

export function requireTenant(req: Request, res: Response, next: NextFunction): void {
  if (!(req as AuthenticatedRequest).college_id) {
    res.status(400).json({ success: false, message: 'Tenant context is required' });
    return;
  }
  next();
}
