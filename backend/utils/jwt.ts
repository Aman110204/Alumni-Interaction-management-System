import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import logger from './logger';

const SECRET = process.env.JWT_SECRET;
if (!SECRET || SECRET.length < 32) {
  if (process.env.NODE_ENV === 'production') {
    logger.error('FATAL: JWT_SECRET is not set or too short for production. Exiting.');
    process.exit(1);
  }
  logger.warn('⚠️  JWT_SECRET is using a weak/default value. Set a strong 64+ char secret in .env');
}

const EFFECTIVE_SECRET: Secret = SECRET || 'fallback_only_for_dev_never_production_32chars_min';
const EXPIRES: SignOptions['expiresIn'] = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];

export interface JwtPayload {
  id: number;
  role: 'student' | 'alumni' | 'admin';
  email: string;
  college_id?: string;
  full_name?: string;
  username?: string;
  iat?: number;
  exp?: number;
}

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  const options: SignOptions = {
    expiresIn: EXPIRES,
    issuer: 'alumni-connect',
  };
  return jwt.sign(payload, EFFECTIVE_SECRET, options);
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, EFFECTIVE_SECRET, { issuer: 'alumni-connect' });
  if (typeof decoded === 'string') {
    throw new Error('Invalid token payload');
  }
  return decoded as JwtPayload;
}
