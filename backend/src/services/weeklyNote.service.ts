
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/errors.util';

const prisma = new PrismaClient();

export const getAllWeeklyNotes = async (year?: number) => {
    return await prisma.weeklyNote.findMany({
        where: year ? { year } : undefined,
        orderBy: { weekNumber: 'desc' },
    });
};

export const createWeeklyNote = async (data: {
    weekNumber: number;
    year: number;
    startDate: string | Date;
    endDate: string | Date;
    content: string;
}) => {
    const { weekNumber, year, startDate, endDate, content } = data;

    const exist = await prisma.weeklyNote.findUnique({
        where: {
            weekNumber_year: {
                weekNumber,
                year,
            },
        },
    });

    if (exist) {
        throw new AppError('Ghi chú cho tuần này đã tồn tại', 400);
    }

    return await prisma.weeklyNote.create({
        data: {
            weekNumber,
            year,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            content,
        },
    });
};

export const updateWeeklyNote = async (id: string, content: string) => {
    const exist = await prisma.weeklyNote.findUnique({ where: { id } });
    if (!exist) {
        throw new AppError('Ghi chú không tồn tại', 404);
    }

    return await prisma.weeklyNote.update({
        where: { id },
        data: { content },
    });
};

export const deleteWeeklyNote = async (id: string) => {
    const exist = await prisma.weeklyNote.findUnique({ where: { id } });
    if (!exist) {
        throw new AppError('Ghi chú không tồn tại', 404);
    }

    return await prisma.weeklyNote.delete({ where: { id } });
};
