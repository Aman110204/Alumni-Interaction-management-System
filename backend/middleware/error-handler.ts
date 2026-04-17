import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export function errorHandler(err: Error & { status?: number; statusCode?: number; code?: string; type?: string; errors?: unknown[] }, req: Request, res: Response, next: NextFunction): Response | void {
  const safeBody: Record<string, unknown> = req.body ? { ...req.body } : {};
  delete safeBody.password;
  delete safeBody.password_hash;
  delete safeBody.currentPassword;
  delete safeBody.newPassword;

  logger.error(`${req.method} ${req.url} — ${err.message}`, {
    stack: err.stack,
    status: err.status || err.statusCode || 500,
    body: JSON.stringify(safeBody).slice(0, 200),
  });

  if (res.headersSent) return next(err);

  if (err.type === 'validation') {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: err.errors });
  }

  // Prisma unique constraint
  if (err.code === 'P2002') {
    return res.status(409).json({ success: false, message: 'Resource already exists (duplicate)' });
  }
  // Prisma foreign key constraint
  if (err.code === 'P2003') {
    return res.status(400).json({ success: false, message: 'Referenced resource does not exist' });
  }
  // Prisma record not found
  if (err.code === 'P2025') {
    return res.status(404).json({ success: false, message: 'Record not found' });
  }

  // PostgreSQL: unique constraint violation (legacy)
  if (err.code === '23505') {
    return res.status(409).json({ success: false, message: 'Resource already exists (duplicate)' });
  }
  // PostgreSQL: foreign key violation (legacy)
  if (err.code === '23503') {
    return res.status(400).json({ success: false, message: 'Referenced resource does not exist' });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  if (err.message && err.message.startsWith('CORS')) {
    return res.status(403).json({ success: false, message: err.message });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request payload too large' });
  }

  const status = err.status || err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production' && status >= 500
      ? 'Internal server error'
      : err.message || 'Internal server error';

  return res.status(status).json({ success: false, message });
}

export function notFoundHandler(req: Request, res: Response): Response {
  return res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`,
  });
}
