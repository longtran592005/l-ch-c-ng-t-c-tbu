/**
 * Database Seeder
 * Seed database với dữ liệu mẫu
 * 
 * IMPORTANT: Run 'npm run prisma:generate' first to generate Prisma Client
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Tạo users
  const adminPassword = await hashPassword('123456');
  console.log('Admin password hash generated:', adminPassword);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@tbu.edu.vn' },
    update: { passwordHash: adminPassword, status: 'active' }, // Reset password + ensure active
    create: {
      email: 'admin@tbu.edu.vn',
      passwordHash: adminPassword,
      name: 'Quản trị viên',
      role: 'admin',
      department: 'Văn phòng',
      position: 'Chánh Văn phòng',
      status: 'active',
    },
  });
  console.log('✅ Created admin user:', admin.email);

  // Admin dự phòng
  const admin2Password = await hashPassword('123456');
  console.log('Admin2 password hash generated:', admin2Password);
  const admin2 = await prisma.user.upsert({
    where: { email: 'admin2@tbu.edu.vn' },
    update: { passwordHash: admin2Password, status: 'active' },
    create: {
      email: 'admin2@tbu.edu.vn',
      passwordHash: admin2Password,
      name: 'Quản trị viên dự phòng',
      role: 'admin',
      department: 'Văn phòng',
      position: 'Phó Chánh Văn phòng',
      status: 'active',
    },
  });
  console.log('✅ Created admin2 user:', admin2.email);

  const bghPassword = await hashPassword('123456');
  console.log('BGH password hash generated:', bghPassword);
  const bgh = await prisma.user.upsert({
    where: { email: 'bgh@tbu.edu.vn' },
    update: { passwordHash: bghPassword }, // Explicitly update passwordHash
    create: {
      email: 'bgh@tbu.edu.vn',
      passwordHash: bghPassword,
      name: 'PGS.TS Phạm Quốc Thành',
      role: 'ban_giam_hieu',
      department: 'Ban Giám hiệu',
      position: 'Hiệu trưởng',
      status: 'active',
    },
  });
  console.log('✅ Created BGH user:', bgh.email);

  const staffPassword = await hashPassword('123456');
  console.log('Staff password hash generated:', staffPassword);
  const staff = await prisma.user.upsert({
    where: { email: 'staff@tbu.edu.vn' },
    update: { passwordHash: staffPassword }, // Explicitly update passwordHash
    create: {
      email: 'staff@tbu.edu.vn',
      passwordHash: staffPassword,
      name: 'Nguyễn Văn B',
      role: 'staff',
      department: 'Phòng Đào tạo',
      position: 'Chuyên viên',
      status: 'active',
    },
  });
  console.log('✅ Created staff user:', staff.email);

  console.log('🎉 Seeding completed!');
  console.log('\n📝 Default login credentials:');
  console.log('  Admin:  admin@tbu.edu.vn / 123456');
  console.log('  Admin2: admin2@tbu.edu.vn / 123456');
  console.log('  BGH:    bgh@tbu.edu.vn / 123456');
  console.log('  Staff:  staff@tbu.edu.vn / 123456');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

