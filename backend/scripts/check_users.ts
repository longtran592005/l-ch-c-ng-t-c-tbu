import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.user.findMany({ select: { email: true, status: true } })
  .then(r => console.log(JSON.stringify(r, null, 2)))
  .finally(() => prisma.$disconnect());
