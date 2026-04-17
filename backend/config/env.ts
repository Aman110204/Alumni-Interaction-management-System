import 'dotenv/config';

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),

  // Database
  DATABASE_URL: process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'alumni_connect'}`,

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_only_for_dev_never_production_32chars_min',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // CORS
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  // Multi-tenancy
  DEFAULT_COLLEGE_ID: process.env.DEFAULT_COLLEGE_ID || 'skit',
  DEFAULT_COLLEGE_NAME: process.env.DEFAULT_COLLEGE_NAME || 'SKIT College',
  DEFAULT_COLLEGE_CODE: process.env.DEFAULT_COLLEGE_CODE || 'SKIT',
  MIGRATE_ALL_TO_DEFAULT_COLLEGE:
    String(process.env.MIGRATE_ALL_TO_DEFAULT_COLLEGE || '').toLowerCase() === 'true',
} as const;

export type Env = typeof env;
export default env;
