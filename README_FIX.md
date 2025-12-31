# Hướng dẫn Cài đặt Website Quản lý Lịch Công Tác TBU

Hướng dẫn chi tiết từng bước để cài đặt và chạy hệ thống Quản lý Lịch Công Tác Tuần cho Ban Giám hiệu Trường Đại học Thái Bình.

---

## 📋 Mục lục

1. [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
2. [Cài đặt cơ bản](#cài-đặt-cơ-bản)
3. [Cài đặt Backend](#cài-đặt-backend)
4. [Cài đặt Frontend](#cài-đặt-frontend)
5. [Chạy hệ thống](#chạy-hệ-thống)
6. [Kiểm tra hệ thống](#kiểm-tra-hệ-thống)
7. [Troubleshooting](#troubleshooting)

---

## 📖 Hướng dẫn cài đặt

Có 2 cách để cài đặt và chạy dự án. Cách dùng Docker được khuyến khích vì đơn giản hơn.

---

### **Cách 1: Cài đặt với Docker (Khuyến khích)**

**Yêu cầu**: Cài đặt **Node.js** và **Docker Desktop**.

**Bước 1: Khởi chạy Backend và Database**

Từ thư mục gốc của dự án, chạy lệnh:
```bash
docker compose up -d
```
Lệnh này sẽ tự động build và chạy backend cùng với database SQL Server. Chờ khoảng 1-2 phút để SQL Server khởi động hoàn tất.

**Bước 2: Cài đặt Database**

Chạy các lệnh sau để tạo cấu trúc database và thêm dữ liệu mẫu:
```bash
# 1. Áp dụng schema (tạo tables)
docker compose exec tbu_backend npx prisma db push --accept-data-loss

# 2. Seed database với dữ liệu mẫu (tài khoản admin, v.v.)
docker compose exec tbu_backend npx prisma db seed
```

**Bước 3: Khởi chạy Frontend**

Mở một terminal **mới** và chạy các lệnh:
```bash
# Cài đặt các gói phụ thuộc cho frontend
npm install

# Khởi chạy giao diện người dùng
npm run dev
```

**✅ Hoàn tất!**
-   Backend API chạy tại `http://localhost:3001`.
-   Frontend chạy tại `http://localhost:8080`.
-   Truy cập `http://localhost:8080` để xem trang web.

---

### **Cách 2: Cài đặt thủ công**

**Yêu cầu**: Cài đặt **Node.js**, **npm/yarn**, và **Microsoft SQL Server >= 2019**.

**Bước 1: Setup Database**

1.  Cài đặt **SQL Server** và **SQL Server Management Studio (SSMS)**.
2.  Dùng SSMS hoặc `sqlcmd` tạo một database mới tên là `tbu_schedule_db`.

**Bước 2: Setup Backend**

1.  Vào thư mục `backend`: `cd backend`
2.  Cài đặt dependencies: `npm install`
3.  Tạo file `.env` và điền `DATABASE_URL` và `JWT` secrets.
    ```env
    DATABASE_URL="sqlserver://localhost:1433;database=tbu_schedule_db;user=sa;password=your_password;trustServerCertificate=true"
    ```
4.  Setup database và chạy backend:
    ```bash
    npm run prisma:migrate # (hoặc npm run prisma:db:push)
    npm run prisma:seed
    npm run dev
    ```

**Bước 3: Setup Frontend**

1.  Quay về thư mục gốc, cài đặt dependencies: `npm install`
2.  Khởi chạy frontend: `npm run dev`

---

## ✅ Kiểm tra hệ thống

### 1. Kiểm tra Backend

```bash
# Health check (nếu chạy bằng Docker)
curl http://localhost:3001/health

# Health check (nếu chạy thủ công)
curl http://localhost:3000/health
```

### 2. Kiểm tra Frontend

Mở browser: `http://localhost:8080`

### 3. Kiểm tra Database

```bash
# Mở Prisma Studio (trong thư mục backend)
cd backend
npm run prisma:studio
```

### 4. Test Login

1. Truy cập: `http://localhost:8080/dang-nhap`
2. Đăng nhập với: `admin@tbu.edu.vn` / `123456`

---

## 🔍 Troubleshooting (Xử lý lỗi)

### ❌ Lỗi: "Cannot find module '@prisma/client'"

**Giải pháp:**
```bash
cd backend
npm install
npm run prisma:generate
```

### ❌ Lỗi: "Can't reach database server"

**Nguyên nhân**: SQL Server chưa chạy hoặc DATABASE_URL sai.

**Giải pháp:**
1. Kiểm tra SQL Server đã chạy:
   ```bash
   # Windows
   services.msc  # Tìm service "SQL Server (MSSQLSERVER)"

   # Nếu dùng Docker
   docker ps # Kiểm tra container "sql_server_dev" hoặc "tbu_mssql" đang chạy
   ```

2. Kiểm tra DATABASE_URL trong `backend/.env`:
   - Đúng format: `sqlserver://user:password@host:port;database=database_name;...`
   - Password đúng chưa?
   - Database đã tạo chưa?
   - `trustServerCertificate=true` có được thêm vào cuối không?

3. Test kết nối:
   ```bash
   # sqlcmd -U sa -P 'your_password' -S localhost
   ```

### ❌ Lỗi: "JWT_SECRET is required"

**Giải pháp:**
1. Kiểm tra file `.env` đã tồn tại trong thư mục `backend/`
2. Kiểm tra `JWT_SECRET` và `JWT_REFRESH_SECRET` đã được set
3. Đảm bảo mỗi secret có ít nhất 32 ký tự
4. Restart server sau khi sửa `.env`

### ❌ Lỗi: "Port 3000 already in use"

**Giải pháp:**
1. Tìm process đang dùng port 3000:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F

   # macOS/Linux
   lsof -ti:3000 | xargs kill
   ```

2. Hoặc đổi PORT trong `.env`:
   ```env
   PORT=3001
   ```
   Và nhớ cập nhật `CORS_ORIGIN` trong backend `.env` và `VITE_API_URL` trong frontend `.env`

### ❌ Lỗi: "Port 8080 already in use"

**Giải pháp:**
Vite sẽ tự động tìm port trống. Hoặc chỉ định port khác:

```bash
npm run dev -- --port 8081
```

### ❌ Lỗi: "Migration failed"

**Giải pháp:**
1. Xóa database và tạo lại:
   ```sql
   DROP DATABASE tbu_schedule_db;
   CREATE DATABASE tbu_schedule_db;
   ```

2. Chạy lại migration:
   ```bash
   npm run prisma:migrate
   ```

### ❌ Lỗi: "Module not found" trong Frontend

**Giải pháp:**
```bash
# Xóa node_modules và cài lại
rm -rf node_modules package-lock.json
npm install
```

### ❌ Frontend không kết nối được Backend

**Giải pháp:**
1. Kiểm tra backend đang chạy: `http://localhost:3000/health`
2. Kiểm tra CORS trong `backend/.env`:
   ```env
   CORS_ORIGIN=http://localhost:8080
   ```
3. Kiểm tra API URL trong frontend code (nếu có file `.env`)

### ❌ Lỗi khi seed database

**Giải pháp:**
1. Đảm bảo đã chạy migration trước:
   ```bash
   npm run prisma:migrate
   ```

2. Xóa và seed lại:
   ```bash
   # Xóa dữ liệu cũ (cẩn thận!)
   npm run prisma:studio  # Xóa manual hoặc
   
   # Seed lại
   npm run prisma:seed
   ```

---

## 📝 Checklist Cài đặt

Trước khi bắt đầu, đánh dấu các bước:

- [ ] Node.js >= 18.0.0 đã cài đặt
- [ ] PostgreSQL >= 14 đã cài đặt và chạy
- [ ] Database `tbu_schedule_db` đã tạo
- [ ] Backend dependencies đã cài (`cd backend && npm install`)
- [ ] Backend `.env` đã cấu hình đúng
- [ ] Backend database migration đã chạy
- [ ] Backend database seed đã chạy
- [ ] Backend server chạy được (`npm run dev`)
- [ ] Frontend dependencies đã cài (`npm install`)
- [ ] Frontend server chạy được (`npm run dev`)
- [ ] Có thể truy cập frontend tại `http://localhost:8080`
- [ ] Có thể đăng nhập với tài khoản admin

---

## 🎯 Cấu trúc Project

Sau khi cài đặt xong, cấu trúc project sẽ như sau:

```
l-ch-c-ng-t-c-tbu/
├── backend/                 # Backend API
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── migrations/     # Migration files
│   ├── src/
│   │   ├── config/         # Configuration
│   │   ├── controllers/    # Route handlers
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   └── utils/          # Utilities
│   ├── .env                # Backend environment variables
│   ├── package.json
│   └── tsconfig.json
│
├── src/                    # Frontend React app
│   ├── components/         # React components
│   ├── contexts/           # Context providers
│   ├── pages/              # Page components
│   ├── utils/              # Frontend utilities
│   └── ...
│
├── .env                    # Frontend environment (optional)
├── package.json            # Frontend dependencies
├── vite.config.ts
└── README_FIX.md           # File này
```

---

## 🔐 Thông tin đăng nhập mặc định

Sau khi seed database, bạn có thể đăng nhập với:

| Vai trò | Email | Password |
|---------|-------|----------|
| Admin | `admin@tbu.edu.vn` | `123456` |
| Ban Giám hiệu | `bgh@tbu.edu.vn` | `123456` |
| Nhân viên | `staff@tbu.edu.vn` | `123456` |

**⚠️ CẢNH BÁO**: Đổi passwords này trong môi trường production!

---

## 📞 Hỗ trợ

Nếu gặp vấn đề, hãy kiểm tra:

1. ✅ Tài liệu này (README_FIX.md)
2. ✅ [BACKEND_SETUP_GUIDE.md](docs/BACKEND_SETUP_GUIDE.md)
3. ✅ [BACKEND_ARCHITECTURE.md](docs/BACKEND_ARCHITECTURE.md)
4. ✅ Logs trong console để xem lỗi chi tiết

Liên hệ: support@tbu.edu.vn

---

## 🚢 Production Deployment

Để deploy lên production, xem thêm:

- [BACKEND_ARCHITECTURE.md](docs/BACKEND_ARCHITECTURE.md) - Phần Deployment Considerations
- Checklist Production trong [BACKEND_SUMMARY.md](docs/BACKEND_SUMMARY.md)

---

**Chúc bạn cài đặt thành công! 🎉**

