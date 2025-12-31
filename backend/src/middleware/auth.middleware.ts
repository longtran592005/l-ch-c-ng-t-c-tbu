/**
 * Authentication Middleware
 * Verify JWT token and attach user to request
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt.util';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.util';
import prisma from '../config/database';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload & { id: string };
    }
  }
}

/**
 * Verify JWT token and attach user to request
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = verifyAccessToken(token);

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, status: true },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedError('User not found or inactive');
    }

    // Attach user to request
    req.user = {
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Require specific role(s)
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
}

/**
 * Require admin or BGH role (can manage schedule)
 */
export function requireManageSchedule(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  const allowedRoles = ['admin', 'ban_giam_hieu'];
  if (!allowedRoles.includes(req.user.role)) {
    return next(new ForbiddenError('Only admin and BGH can manage schedules'));
  }

  next();
}

