# Hướng dẫn khởi động Backend Server

## ⚠️ Lỗi hiện tại
Backend server chưa chạy, dẫn đến lỗi `ERR_CONNECTION_REFUSED` khi frontend cố kết nối.

## 🚀 Cách khởi động Backend

### Phương án 1: Chạy trực tiếp (Development)

1. **Mở terminal mới** và chuyển đến thư mục backend:
   ```bash
   cd backend
   ```

2. **Cài đặt dependencies** (nếu chưa có):
   ```bash
   npm install
   ```

3. **Tạo file `.env`** trong thư mục `backend/` với nội dung:
   ```env
   DATABASE_URL="sqlserver://localhost:1433;database=tbu_schedule_db;user=sa;password=yourStrong(!)Password;trustServerCertificate=true"
   JWT_SECRET="your-super-secret-jwt-token-at-least-32-chars-long-for-security"
   JWT_REFRESH_SECRET="your-super-secret-jwt-refresh-token-at-least-32-chars-long"
   PORT=3000
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:8080
   API_PREFIX=/api
   ```

4. **Setup database** (nếu chưa có):
   ```bash
   # Generate Prisma Client
   npm run prisma:generate
   
   # Push schema to database (tạo tables)
   npm run prisma:db:push
   ```

5. **Khởi động server**:
   ```bash
   npm run dev
   ```

   Server sẽ chạy tại `http://localhost:3000`

### Phương án 2: Chạy bằng Docker Compose

1. **Đảm bảo Docker đang chạy**

2. **Từ thư mục root**, chạy:
   ```bash
   docker-compose up -d
   ```

   Lưu ý: Backend trong Docker chạy ở port **3001**, bạn cần cập nhật `VITE_API_BASE_URL` trong file `.env` của frontend:
   ```env
   VITE_API_BASE_URL=http://localhost:3001
   ```

## 🔧 Cấu hình Frontend

Đảm bảo file `.env` ở **thư mục root** (cùng cấp với `package.json`) có:
```env
VITE_API_BASE_URL=http://localhost:3000
```

Nếu dùng Docker (backend chạy ở port 3001):
```env
VITE_API_BASE_URL=http://localhost:3001
```

## ✅ Kiểm tra Backend đã chạy

Mở trình duyệt và truy cập:
- Health check: http://localhost:3000/api/health
- Hoặc: http://localhost:3001/api/health (nếu dùng Docker)

Nếu thấy response JSON, backend đã chạy thành công!

## 🐛 Troubleshooting

### Lỗi: "Cannot connect to database"
- Kiểm tra SQL Server đang chạy
- Kiểm tra `DATABASE_URL` trong file `.env` đúng chưa
- Nếu dùng Docker, đảm bảo container `tbu_mssql` đang chạy

### Lỗi: "Port 3000 already in use"
- Đổi `PORT=3001` trong file `.env` của backend
- Cập nhật `VITE_API_BASE_URL=http://localhost:3001` trong frontend

### Lỗi: "Prisma Client not generated"
- Chạy: `npm run prisma:generate` trong thư mục backend

