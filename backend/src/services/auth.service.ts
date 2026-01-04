import { PrismaClient } from '@prisma/client';
import { hashPassword, verifyPassword } from '../utils/bcrypt.util';
import { generateAccessToken, generateRefreshToken, TokenPayload } from '../utils/jwt.util';
import { AppError, ValidationError, UnauthorizedError } from '../utils/errors.util';
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

  console.log('RegisterUser: Starting registration process for email:', email);

  // Check if user already exists
  console.log('RegisterUser: Checking if user already exists for email:', email);
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    console.log('RegisterUser: Email already registered:', email);
    throw new ValidationError('Email already registered');
  }
  console.log('RegisterUser: Email not registered, proceeding with new user creation.');

  const hashedPassword = await hashPassword(password);
  console.log('RegisterUser: Password hashed.');

  console.log('RegisterUser: Attempting to create new user in database.');
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
  console.log('RegisterUser: New user created successfully with ID:', newUser.id);

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

