import prisma from '../config/database';
import { ValidationError } from '../utils/errors.util';

const roomModel = (prisma as any).room;

const validatePriority = (priority: number) => {
  if (![1, 2, 3].includes(priority)) {
    throw new ValidationError('Độ ưu tiên phòng phải từ 1 đến 3');
  }
};

export const getAllRooms = async (): Promise<any[]> => {
  return roomModel.findMany({
    where: { isActive: true },
    orderBy: [
      { priority: 'desc' },
      { name: 'asc' },
    ],
  });
};

export const createRoom = async (data: any): Promise<any> => {
  validatePriority(Number(data.priority ?? 1));

  return roomModel.create({
    data: {
      name: String(data.name || '').trim(),
      description: data.description || null,
      priority: Number(data.priority ?? 1),
      isActive: data.isActive !== false,
    },
  });
};

export const updateRoom = async (id: string, data: any): Promise<any> => {
  if (data.priority !== undefined) {
    validatePriority(Number(data.priority));
  }

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = String(data.name).trim();
  if (data.description !== undefined) updateData.description = data.description || null;
  if (data.priority !== undefined) updateData.priority = Number(data.priority);
  if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);

  return roomModel.update({
    where: { id },
    data: updateData,
  });
};

export const deleteRoom = async (id: string): Promise<any> => {
  return roomModel.update({
    where: { id },
    data: { isActive: false },
  });
};
