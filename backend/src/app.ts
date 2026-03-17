import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import { requestLogger } from './middleware/requestLogger.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import apiRoutes from './routes/index.js';

export function createApp() {
  const app = express();

  // Security
  app.use(helmet());
  app.use(cors({
    origin: config.CORS_ORIGIN,
    credentials: true,
  }));

  // Parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Logging & rate limiting
  app.use(requestLogger);
  app.use(generalLimiter);

  // Health check (before API routes, no auth needed)
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api/v1', apiRoutes);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
