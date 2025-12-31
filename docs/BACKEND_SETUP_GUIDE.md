# Backend Setup Guide - Hướng dẫn Thiết lập Backend

## 📋 Tổng quan

Hướng dẫn từng bước để thiết lập và chạy backend API cho hệ thống Quản lý Lịch Công Tác TBU.

## 🎯 Bước 1: Cài đặt Dependencies

```bash
cd backend
npm install
```

## 🎯 Bước 2: Cấu hình Environment

1. Copy file `.env.example` thành `.env`:
```bash
cp .env.example .env
```

2. Sửa file `.env` với các giá trị phù hợp:

```env
# Database - Thay đổi theo môi trường của bạn
DATABASE_URL="postgresql://username:password@localhost:5432/tbu_schedule_db?schema=public"

# JWT Secrets - QUAN TRỌNG: Đổi trong production!
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars-long

# Server
PORT=3000
NODE_ENV=development

# CORS - Địa chỉ frontend
CORS_ORIGIN=http://localhost:8080
```

**⚠️ Lưu ý**: 
- `JWT_SECRET` và `JWT_REFRESH_SECRET` phải có ít nhất 32 ký tự
- Trong production, sử dụng secrets phức tạp và không commit vào git

## 🎯 Bước 3: Setup PostgreSQL Database

### 3.1. Cài đặt PostgreSQL

**Windows:**
- Download từ https://www.postgresql.org/download/windows/
- Hoặc dùng Chocolatey: `choco install postgresql`

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 3.2. Tạo Database

```bash
# Login vào PostgreSQL
psql -U postgres

# Tạo database
CREATE DATABASE tbu_schedule_db;

# Tạo user (optional)
CREATE USER tbu_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE tbu_schedule_db TO tbu_user;

# Exit
\q
```

### 3.3. Update DATABASE_URL trong .env

```env
DATABASE_URL="postgresql://tbu_user:your_password@localhost:5432/tbu_schedule_db?schema=public"
```

## 🎯 Bước 4: Chạy Database Migrations

```bash
# Generate Prisma Client
npm run prisma:generate

# Tạo và chạy migrations
npm run prisma:migrate
```

Lần đầu chạy sẽ tạo file migration và áp dụng schema vào database.

## 🎯 Bước 5: (Optional) Seed Database

Tạo file `prisma/seed.ts` để thêm dữ liệu mẫu:

```typescript
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/bcrypt.util';

const prisma = new PrismaClient();

async function main() {
  // Tạo admin user
  const adminPassword = await hashPassword('123456');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@tbu.edu.vn' },
    update: {},
    create: {
      email: 'admin@tbu.edu.vn',
      passwordHash: adminPassword,
      name: 'Quản trị viên',
      role: 'admin',
      department: 'Văn phòng',
      position: 'Chánh Văn phòng',
    },
  });

  // Tạo BGH user
  const bghPassword = await hashPassword('123456');
  const bgh = await prisma.user.upsert({
    where: { email: 'bgh@tbu.edu.vn' },
    update: {},
    create: {
      email: 'bgh@tbu.edu.vn',
      passwordHash: bghPassword,
      name: 'PGS.TS Nguyễn Văn A',
      role: 'ban_giam_hieu',
      department: 'Ban Giám hiệu',
      position: 'Hiệu trưởng',
    },
  });

  console.log('✅ Seeded database:', { admin, bgh });
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Sau đó thêm vào `package.json`:

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

Chạy seed:
```bash
npm run prisma:seed
```

## 🎯 Bước 6: Chạy Development Server

```bash
npm run dev
```

Server sẽ chạy tại `http://localhost:3000`

Kiểm tra health check:
```bash
curl http://localhost:3000/health
```

## 🎯 Bước 7: Test API (Optional)

Sử dụng Postman, Thunder Client, hoặc curl:

### Test Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@tbu.edu.vn",
    "password": "123456"
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "user": {
      "id": "...",
      "email": "admin@tbu.edu.vn",
      "name": "Quản trị viên",
      "role": "admin"
    }
  }
}
```

## 📚 Xem Database với Prisma Studio

```bash
npm run prisma:studio
```

Mở browser tại `http://localhost:5555`

## 🔧 Troubleshooting

### Lỗi: "Can't reach database server"

- Kiểm tra PostgreSQL đã chạy chưa: `pg_isready`
- Kiểm tra DATABASE_URL trong `.env` đúng chưa
- Kiểm tra firewall/port 5432

### Lỗi: "Migration failed"

- Kiểm tra database đã tạo chưa
- Kiểm tra quyền user PostgreSQL
- Xóa database và tạo lại nếu cần

### Lỗi: "JWT_SECRET is required"

- Kiểm tra file `.env` đã tồn tại
- Kiểm tra JWT_SECRET và JWT_REFRESH_SECRET đã set
- Restart server sau khi sửa `.env`

## 🚀 Next Steps

Sau khi setup xong backend:

1. ✅ Implement authentication endpoints
2. ✅ Implement schedule CRUD endpoints
3. ✅ Implement chatbot endpoint
4. ✅ Tích hợp với frontend

Xem tiếp: [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md)

