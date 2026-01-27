import prisma from '../config/database';
import { hashPassword, verifyPassword } from '../utils/bcrypt.util';
import { NotFoundError, AppError } from '../utils/errors.util'; // Import NotFoundError and AppError

export async function listUsers() {
  const users = await prisma.user.findMany({
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
    orderBy: {
      createdAt: 'desc',
    },
  });
  return users;
}

export async function deleteUser(id: string) {
  const existingUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!existingUser) {
    throw new NotFoundError('User');
  }

  await prisma.user.delete({
    where: { id },
  });
  return { message: 'User deleted successfully' };
}

export async function updateUserStatus(id: string, status: 'active' | 'inactive') {
  const existingUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!existingUser) {
    throw new NotFoundError('User');
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { status },
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
    },
  });
  return updatedUser;
}

export async function resetUserPassword(id: string, newPassword: string) {
  const existingUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!existingUser) {
    throw new NotFoundError('User');
  }

  const hashedPassword = await hashPassword(newPassword);

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { passwordHash: hashedPassword },
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
    },
  });
  return updatedUser;
}

export async function updateUser(id: string, data: any) {
  const transformed: any = {};
  if (data.name !== undefined) transformed.name = data.name;
  if (data.email !== undefined) transformed.email = data.email;
  if (data.role !== undefined) transformed.role = data.role;
  if (data.department !== undefined) transformed.department = data.department;
  if (data.status !== undefined) transformed.status = data.status;
  if (data.password) {
    transformed.passwordHash = await hashPassword(data.password);
  }

  const user = await prisma.user.update({
    where: { id },
    data: transformed,
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
    },
  });

  return user;
}
export async function changePassword(id: string, oldPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  const isPasswordValid = await verifyPassword(oldPassword, user.passwordHash);

  if (!isPasswordValid) {
    throw new AppError(400, 'INVALID_PASSWORD', 'Mật khẩu hiện tại không chính xác');
  }

  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id },
    data: { passwordHash: hashedPassword },
  });

  return { message: 'Đổi mật khẩu thành công' };
}
