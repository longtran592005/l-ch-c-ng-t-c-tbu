import { PrismaClient } from '@prisma/client';
import { hashPassword, verifyPassword } from '../utils/bcrypt.util';
import { generateAccessToken, generateRefreshToken, TokenPayload } from '../utils/jwt.util';
import { AppError, BadRequestError, UnauthorizedError } from '../utils/errors.util';
import { prisma } from '../config/database'; // Import prisma instance
import { jwtConfig, parseExpiry } from '../config/jwt';

interface RegisterUserInput {
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'ban_giam_hieu' | 'staff' | 'viewer'; // Optional role, default to viewer
}

interface LoginUserInput {
  email: string;
  password: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export async function registerUser(input: RegisterUserInput): Promise<{ user: Omit<PrismaClient['user'], 'passwordHash'> }> {
  const { email, password, name, role } = input;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new BadRequestError('Email already registered');
  }

  const hashedPassword = await hashPassword(password);

  const newUser = await prisma.user.create({
    data: {
      email,
      passwordHash: hashedPassword,
      name,
      role: role || 'viewer', // Default role to 'viewer' if not provided
      status: 'active',
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      department: true,
      position: true,
      phone: true,
      avatar: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
    },
  });

  return { user: newUser };
}

export async function loginUser(input: LoginUserInput): Promise<{ user: Omit<PrismaClient['user'], 'passwordHash'>; tokens: AuthTokens }> {
  const { email, password } = input;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }
  console.log('Retrieved user.passwordHash:', user.passwordHash);

  if (user.status !== 'active') {
    throw new UnauthorizedError('Account is inactive or suspended');
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);
  console.log('Password comparison result (isPasswordValid):', isPasswordValid);

  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Update last login time
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const tokenPayload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);



// ... (rest of the file)

  // Store refresh token
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + (parseExpiry(jwtConfig.refreshExpiry) * 1000)), // Use configured expiry
    },
  });

  // Exclude passwordHash from returned user object
  const { passwordHash, ...userWithoutPasswordHash } = user;

  return {
    user: userWithoutPasswordHash,
    tokens: {
      accessToken,
      refreshToken,
    },
  };
}

