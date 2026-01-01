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
# Database - Thay đổi theo môi trường của bạn (ví dụ cho SQL Server)
DATABASE_URL="sqlserver://localhost:1433;database=tbu_schedule_db;user=sa;password=yourStrong(!)Password;trustServerCertificate=true"

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

## 🎯 Bước 3: Setup Database (SQL Server)

Ứng dụng này sử dụng SQL Server. Bạn cần đảm bảo có một instance SQL Server đang chạy và bạn có thông tin đăng nhập phù hợp.

**Lưu ý:** Nếu bạn đang sử dụng `docker-compose.yml` (trong thư mục gốc của dự án), SQL Server sẽ được tự động khởi tạo.

### 3.1. Cài đặt SQL Server (nếu không dùng Docker)

Bạn có thể tải SQL Server Express hoặc Developer Edition từ trang web của Microsoft.

### 3.2. Cấu hình `DATABASE_URL`

Đảm bảo biến `DATABASE_URL` trong tệp `.env` của bạn trỏ đến SQL Server instance chính xác. Ví dụ:

```env
DATABASE_URL="sqlserver://localhost:1433;database=tbu_schedule_db;user=sa;password=yourStrong(!)Password;trustServerCertificate=true"
```
Thay `localhost:1433` bằng địa chỉ và port của SQL Server của bạn, và `user`, `password`, `database` cho phù hợp. `trustServerCertificate=true` thường được dùng cho môi trường phát triển.

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

- Kiểm tra SQL Server instance đã chạy chưa
- Kiểm tra `DATABASE_URL` trong `.env` đúng chưa (bao gồm server, port, user, password, database)
- Kiểm tra tường lửa (firewall) hoặc port của SQL Server

### Lỗi: "Migration failed"

- Kiểm tra database đã tạo chưa (hoặc service SQL Server đang chạy)
- Kiểm tra quyền user truy cập vào SQL Server
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


