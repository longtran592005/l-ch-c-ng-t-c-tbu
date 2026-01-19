/**
 * Express App Setup
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import env from './config/env';
import { errorHandler } from './middleware/error.middleware';
import { apiRateLimiter } from './middleware/rateLimiter.middleware';

const app = express();

// Configure MIME types for audio files
express.static.mime.define({
  'audio/m4a': ['m4a'],
  'audio/x-m4a': ['m4a'],
});

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(apiRateLimiter);

// Static files with proper CORS headers
app.use('/uploads', (_req, res, next) => {
  res.header('Access-Control-Allow-Origin', env.CORS_ORIGIN);
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Accept-Ranges', 'bytes');
  next();
}, express.static('uploads', {
  setHeaders: (res, filepath) => {
    // Set proper MIME types for audio files
    if (filepath.endsWith('.m4a')) {
      res.setHeader('Content-Type', 'audio/mp4');
    }
    // Enable caching for better performance
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  }
}));

// API routes
import apiRouter from './routes';
app.use(env.API_PREFIX, apiRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;

