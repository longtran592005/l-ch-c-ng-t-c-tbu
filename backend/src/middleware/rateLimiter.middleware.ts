/**
 * Rate Limiting Middleware
 */

import rateLimit from 'express-rate-limit';
import env from '../config/env';

/**
 * General API rate limiter
 */
export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for health check and static files
  skip: (req) => {
    return req.path === '/api/health' || 
           req.path === '/health' ||
           req.path.startsWith('/uploads/');
  },
  // Increase limit for development
  ...(process.env.NODE_ENV === 'development' && {
    max: 200, // Double the limit in development
  }),
});

/**
 * Login rate limiter (stricter)
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.RATE_LIMIT_LOGIN_MAX,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts, please try again later',
    },
  },
  skipSuccessfulRequests: true,
});

/**
 * Audio to text conversion rate limiter
 * Cho phép ít request hơn vì mỗi request mất nhiều thời gian (có thể vài phút)
 */
export const audioToTextRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 phút
  max: 3, // Chỉ cho phép 3 request trong 10 phút
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many audio conversion requests. Please wait a few minutes before trying again.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Tăng limit trong development
  ...(process.env.NODE_ENV === 'development' && {
    max: 5, // 5 requests trong development
  }),
});

