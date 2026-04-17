import { CorsOptions } from 'cors';
import { env } from './env';
import logger from '../utils/logger';

const BASE_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  ...env.ALLOWED_ORIGINS,
];

function normalizeOrigin(origin: string): string {
  return String(origin || '').trim().replace(/\/+$/, '');
}

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  const normalizedOrigin = normalizeOrigin(origin);
  const normalizedAllowed = BASE_ALLOWED_ORIGINS.map(normalizeOrigin);
  if (normalizedAllowed.includes(normalizedOrigin)) return true;

  try {
    const url = new URL(normalizedOrigin);
    const hostname = (url.hostname || '').toLowerCase();
    const port = url.port || (url.protocol === 'https:' ? '443' : '80');
    if (
      url.protocol === 'http:' &&
      port === '3000' &&
      (hostname.endsWith('.lvh.me') || hostname.endsWith('.alumni.local'))
    ) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

export const corsOptions: CorsOptions = {
  origin(origin, cb) {
    if (isAllowedOrigin(origin)) return cb(null, true);
    logger.warn(`CORS blocked: ${origin}`);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-College-ID', 'X-Tenant-Host'],
  credentials: true,
  maxAge: 86400,
};

export default corsOptions;
