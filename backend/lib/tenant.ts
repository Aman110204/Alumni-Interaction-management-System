/**
 * lib/tenant.ts
 *
 * Tenant resolver utility.
 *
 * Accepts an HTTP `host` header value (e.g. "skit.lvh.me:3000") and
 * resolves the matching College record from the database via its
 * `subdomain` field.
 *
 * Usage
 * -----
 *   import { resolveTenantFromHost } from '../lib/tenant';
 *
 *   const college = await resolveTenantFromHost(req.headers.host);
 *   if (!college) return res.status(404).json({ error: 'Unknown tenant' });
 *
 * Works with lvh.me in local development:
 *   skit.lvh.me:3000  ->  subdomain = "skit"  ->  College { id: "skit", ... }
 */

import prisma from '../prisma/client';
import type { College } from '@prisma/client';

// ─── Subdomain Extraction ─────────────────────────────────────────────────────

/**
 * Parses a raw `host` header string and returns the leftmost subdomain label,
 * or `null` when the host is bare (localhost, IP, or single-label domain).
 *
 * @example
 *   extractSubdomainFromHost('skit.lvh.me:3000')  // -> 'skit'
 *   extractSubdomainFromHost('lvh.me')             // -> null
 *   extractSubdomainFromHost('localhost:3000')      // -> null
 */
export function extractSubdomainFromHost(host: string | null | undefined): string | null {
  if (!host) return null;

  const hostname = host.split(':')[0].toLowerCase().trim();

  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)
  ) {
    return null;
  }

  const parts = hostname.split('.');
  if (parts.length < 3) return null;

  return parts[0].trim() || null;
}

// ─── Database Lookup ──────────────────────────────────────────────────────────

/**
 * Looks up a College by its subdomain field.
 * Returns null when subdomain is falsy or no matching row exists.
 */
export async function resolveCollegeBySubdomain(
  subdomain: string | null | undefined,
): Promise<College | null> {
  if (!subdomain) return null;
  const normalized = subdomain.toLowerCase().trim();
  if (!normalized) return null;

  return prisma.college.findUnique({ where: { subdomain: normalized } });
}

/**
 * Primary utility — accepts the raw `host` header and returns the College.
 *
 * This is the single entry point you should call from middleware / controllers
 * when resolving the current tenant from an HTTP request.
 *
 * @param host - value of req.headers.host, e.g. "skit.lvh.me:3000"
 * @returns College record, or null if no subdomain / unknown tenant
 */
export async function resolveTenantFromHost(
  host: string | null | undefined,
): Promise<College | null> {
  const subdomain = extractSubdomainFromHost(host);
  return resolveCollegeBySubdomain(subdomain);
}

// ─── Cross-Tenant Guard ───────────────────────────────────────────────────────

/**
 * Throws HTTP 403 when a user's collegeId does not match the resolved tenant.
 *
 * Integrate this in your auth service after JWT verification to enforce that
 * no user can authenticate on another college's subdomain.
 *
 * @param userCollegeId   - collegeId on the authenticated user record
 * @param tenantCollegeId - collegeId resolved from the incoming request host
 *
 * @throws {{ status: 403, message: string }} on mismatch
 */
export function assertSameTenant(
  userCollegeId: string | null | undefined,
  tenantCollegeId: string | null | undefined,
): void {
  if (!userCollegeId || !tenantCollegeId) return;
  if (userCollegeId.toLowerCase() !== tenantCollegeId.toLowerCase()) {
    throw Object.assign(
      new Error('Cross-tenant access denied: your account does not belong to this college'),
      { status: 403 },
    );
  }
}
