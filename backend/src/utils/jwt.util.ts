/**
 * JWT Utilities
 * Generate and verify JWT tokens
 */
import jwt from 'jsonwebtoken';
import { jwtConfig, parseExpiry } from '../config/jwt';
import { UnauthorizedError } from './errors.util';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Generate access token
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, jwtConfig.accessSecret, {
    expiresIn: jwtConfig.accessExpiry as any,
  });
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiry as any,
  });
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, jwtConfig.accessSecret) as TokenPayload;
  } catch (error) {
    throw new UnauthorizedError('Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.');
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, jwtConfig.refreshSecret) as TokenPayload;
  } catch (error) {
    throw new UnauthorizedError('Phiên làm mới đã hết hạn. Vui lòng đăng nhập lại.');
  }
}

/**
 * Get token expiry time in seconds
 */
export function getAccessTokenExpiry(): number {
  return parseExpiry(jwtConfig.accessExpiry);
}
