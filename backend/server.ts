import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { env } from './config/env';
import { corsOptions } from './config/cors';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { attachTenantContext } from './middleware/tenant-middleware';
import { rules, validate } from './middleware/validate';
import { requireAlumni } from './middleware/auth-middleware';
import { alumniController } from './controllers/alumni-controller';

// Module routes
import adminRoutes from './modules/admin/admin-routes';
import studentRoutes from './modules/student/student-routes';
import alumniRoutes from './modules/alumni/alumni-routes';
import featureRoutes from './modules/features/feature-routes';
import socialRoutes from './modules/social/social-routes';

import logger from './utils/logger';
import prisma from './prisma/client';

const app = express();
const alumniAuthAliasRouter = express.Router();

// ── Security Middleware ────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/admin/login', authLimiter);
app.use('/api/student/login', authLimiter);
app.use('/api/alumni-auth/login', authLimiter);
app.use('/api/alumni/login', authLimiter);

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '3.0.0' });
});

// ── Tenant Context (global) ───────────────────────────────────────────────────
app.use('/api', attachTenantContext);

// ── Routes ────────────────────────────────────────────────────────────────────
alumniAuthAliasRouter.post('/register', rules.alumniRegister, validate, alumniController.register);
alumniAuthAliasRouter.post('/login', rules.alumniLogin, validate, alumniController.login);
alumniAuthAliasRouter.get('/profile', ...requireAlumni, alumniController.getProfile);
alumniAuthAliasRouter.put('/profile', ...requireAlumni, rules.alumniProfileUpdate, validate, alumniController.updateProfile);
alumniAuthAliasRouter.patch('/profile', ...requireAlumni, rules.alumniProfileUpdate, validate, alumniController.updateProfile);
alumniAuthAliasRouter.get('/dashboard', ...requireAlumni, alumniController.getDashboard);

app.use('/api/admin', adminRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/alumni', alumniRoutes);
app.use('/api/alumni-auth', alumniAuthAliasRouter);
app.use('/api', featureRoutes);
app.use('/api', socialRoutes);

// ── 404 & Error Handlers ──────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected via Prisma');

    app.listen(env.PORT, () => {
      logger.info(`🚀 Server running on port ${env.PORT} [${env.NODE_ENV}]`);
    });
  } catch (err) {
    logger.error('Failed to start server', err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received — shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

bootstrap().catch((err) => {
  logger.error('Bootstrap failed', err);
  process.exit(1);
});

export default app;
