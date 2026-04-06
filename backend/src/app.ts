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

// Trust reverse proxy headers (Nginx) to avoid rate-limit proxy warnings.
app.set('trust proxy', 1);

// Configure MIME types for audio files
express.static.mime.define({
  'audio/mpeg': ['mp3'],
  'audio/m4a': ['m4a'],
  'audio/x-m4a': ['m4a'],
});

// Security middleware
app.use(helmet());

// CORS - Cho phép nhiều origin (phân cách bằng dấu phẩy)
const corsOrigins = env.CORS_ORIGIN
  ? env.CORS_ORIGIN.split(',').map(o => o.trim())
  : [];
app.use(
  cors({
    origin: corsOrigins.length === 0 ? true : corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
    credentials: true,
  })
);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(apiRateLimiter);

// Static files with restricted access
app.use('/uploads', express.static('uploads', {
  setHeaders: (res, filepath) => {
    // Set proper MIME types for audio files
    if (filepath.endsWith('.m4a')) {
      res.setHeader('Content-Type', 'audio/mp4');
    } else if (filepath.endsWith('.mp3')) {
      res.setHeader('Content-Type', 'audio/mpeg');
    }
    // Enable caching for better performance
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    // Bảo mật: Không cho phép iframe từ trang khác nhúng
    res.setHeader('X-Frame-Options', 'DENY');
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

