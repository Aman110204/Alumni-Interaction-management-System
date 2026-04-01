'use strict';
require('dotenv').config();
const express  = require('express');
const helmet   = require('helmet');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');

const { initDatabase } = require('./config/database');
const routes           = require('./routes/index');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { attachTenantContext } = require('./middleware/tenantMiddleware');
const logger           = require('./utils/logger');

const app  = express();
const PORT = parseInt(process.env.PORT || '5000', 10);
app.set('trust proxy', 1);

// Security - CSP disabled for React dev compatibility
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// CORS - allow React dev server + same-origin
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  ...(process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean),
];

function normalizeOrigin(origin) {
  return String(origin || '').trim().replace(/\/+$/, '');
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  const normalizedOrigin = normalizeOrigin(origin);
  const normalizedAllowedOrigins = ALLOWED_ORIGINS.map(normalizeOrigin);
  if (normalizedAllowedOrigins.includes(normalizedOrigin)) return true;

  try {
    const url = new URL(normalizedOrigin);
    const hostname = (url.hostname || '').toLowerCase();
    const port = url.port || (url.protocol === 'https:' ? '443' : '80');
    if (url.protocol === 'http:' && port === '3000' && (
      hostname.endsWith('.lvh.me') ||
      hostname.endsWith('.alumni.local')
    )) {
      return true;
    }
  } catch (_err) {
    return false;
  }

  return false;
}

app.use(cors({
  origin(origin, cb) {
    if (isAllowedOrigin(origin)) return cb(null, true);
    logger.warn(`CORS blocked: ${origin}`);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(attachTenantContext);

app.use((req, _res, next) => {
  logger.debug(`-> ${req.method} ${req.url} [${req.ip}]`);
  next();
});

// API Routes
app.use('/api', routes);

// Serve React build in production
const reactBuildDir = path.join(__dirname, '..', 'frontend', 'build');
if (fs.existsSync(path.join(reactBuildDir, 'index.html'))) {
  app.use(express.static(reactBuildDir));
  app.get('*', (_req, res) => res.sendFile(path.join(reactBuildDir, 'index.html')));
} else {
  app.get('/', (_req, res) =>
    res.json({ status: 'ok', message: 'Gully Connect API running. Start React on port 3000.' })
  );
}

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      logger.info('Gully Connect API -> http://localhost:' + PORT + '/api/health');
      logger.info('React Frontend   -> http://localhost:3000  (npm start in /frontend)');
    });
  } catch (err) {
    logger.error('Failed to start:', err);
    process.exit(1);
  }
}

start();
