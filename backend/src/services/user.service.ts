import prisma from '../config/database';
import { hashPassword } from '../utils/bcrypt.util';

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
