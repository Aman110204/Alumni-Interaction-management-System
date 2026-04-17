import { Prisma } from '@prisma/client';
import prisma from '../prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// Subdomain helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts a college name into a URL-safe subdomain base string.
 *
 * Rules:
 *  - Lowercase
 *  - Replace any run of non-alphanumeric characters with nothing
 *    (spaces, hyphens, dots, brackets, etc. are all stripped)
 *  - Trim the result
 *
 * Examples:
 *   "SKIT College"          → "skitcollege"
 *   "IIT Bombay"            → "iitbombay"
 *   "St. Xavier's College"  → "stxavierscollege"
 *   "MIT (Manipal)"         → "mitmanipal"
 */
function toSubdomainBase(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // keep only letters and digits
    .trim();
}

/**
 * Finds a subdomain that is not yet taken in the `colleges` table.
 *
 * Strategy:
 *   1. Try the bare base (e.g. "skit").
 *   2. If taken, append an incrementing integer: "skit1", "skit2", …
 *      (up to MAX_ATTEMPTS).
 *
 * Throws if no free subdomain can be found within MAX_ATTEMPTS.
 */
async function resolveUniqueSubdomain(base: string): Promise<string> {
  const MAX_ATTEMPTS = 50;

  // Attempt the bare base first
  const bare = await prisma.college.findUnique({
    where: { subdomain: base },
    select: { id: true },
  });
  if (!bare) return base;

  // Walk through numeric suffixes
  for (let i = 1; i <= MAX_ATTEMPTS; i++) {
    const candidate = `${base}${i}`;
    const existing = await prisma.college.findUnique({
      where: { subdomain: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }

  throw new Error(
    `Could not allocate a unique subdomain for base "${base}" after ${MAX_ATTEMPTS} attempts.`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// createCollege
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateCollegeInput {
  /** Internal, URL-safe college identifier (used as PK), e.g. "skit". */
  id: string;
  /** Human-readable college name, e.g. "SKIT College". */
  name: string;
  location?: string;
  code?: string;
  domain?: string;
  metadata?: Record<string, unknown>;
  /**
   * Optional explicit subdomain override.
   * When omitted the subdomain is auto-derived from `name`.
   */
  subdomain?: string;
}

/**
 * Creates a new College row with a guaranteed-unique subdomain.
 *
 * The subdomain is derived from the college `name` by stripping all
 * non-alphanumeric characters and lowercasing. If the resulting value
 * is already taken a numeric suffix is appended ("skit1", "skit2", …).
 *
 * @example
 *   const college = await createCollege({ id: 'skit', name: 'SKIT College' });
 *   // college.subdomain → "skitcollege"  (or "skitcollege1" if taken)
 *
 * @example – with override
 *   const college = await createCollege({ id: 'skit', name: 'SKIT College', subdomain: 'skit' });
 *   // college.subdomain → "skit"  (or "skit1" if "skit" is taken)
 */
export async function createCollege(input: CreateCollegeInput) {
  const { id, name, location, code, domain, metadata, subdomain: subdomainOverride } = input;

  // Derive a base subdomain from the override or from the name
  const base = subdomainOverride
    ? toSubdomainBase(subdomainOverride)
    : toSubdomainBase(name);

  if (!base) {
    throw new Error(
      `Cannot derive a valid subdomain from name "${name}". ` +
        'Ensure the name contains at least one alphanumeric character.',
    );
  }

  // Resolve to the first available subdomain (base, base1, base2, …)
  const subdomain = await resolveUniqueSubdomain(base);

  return prisma.college.create({
    data: {
      id,
      name,
      subdomain,
      location,
      code,
      domain,
      metadata: (metadata ?? {}) as Prisma.InputJsonObject,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Lookup helper – useful in the Express tenant middleware
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Finds a college by its subdomain field (not by PK).
 * Returns null when no matching college exists.
 *
 * Use this in your Express tenant middleware to resolve an incoming
 * lvh.me subdomain to a College record:
 *
 *   const college = await findCollegeBySubdomain('skit');
 *   if (!college) return res.status(404).json({ error: 'Unknown tenant' });
 */
export async function findCollegeBySubdomain(subdomain: string) {
  return prisma.college.findUnique({
    where: { subdomain: subdomain.toLowerCase().trim() },
  });
}
