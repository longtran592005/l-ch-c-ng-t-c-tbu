# 📅 Hệ thống Quản lý Lịch công tác - Trường Đại học Thái Bình (TBU)

<div align="center">

![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat&logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat&logo=node.js)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat&logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=flat&logo=postgresql)

**Ứng dụng web quản lý và hiển thị lịch công tác, tin tức, và các hoạt động nội bộ của Trường Đại học Thái Bình**

</div>

---

## ✨ Tính năng chính

### 👥 Người dùng công khai
| Tính năng | Mô tả |
|-----------|-------|
| **Xem lịch công tác** | Tra cứu lịch công tác theo giao diện tuần/tháng |
| **Tin tức & Thông báo** | Cập nhật tin tức, sự kiện mới nhất |
| **Tìm kiếm thông minh** | Lọc nhanh bài viết theo từ khóa |
| **Trợ lý AI Chatbot** | Tra cứu lịch công tác bằng hội thoại tự nhiên |

### 🔐 Quản trị viên
| Tính năng | Mô tả |
|-----------|-------|
| **Quản lý CRUD** | Tạo, đọc, cập nhật, xóa lịch/tin tức/thông báo |
| **Phê duyệt lịch** | Kiểm duyệt lịch công tác trước khi công khai |
| **Biên bản cuộc họp** | Ghi chép, ghi âm và AI tự động tạo biên bản |
| **Text-to-Speech** | Chuyển lịch công tác thành audio |

---

## 🛠️ Công nghệ

<table>
<tr>
<td width="50%">

### Frontend
- **React 18** + TypeScript
- **Vite** - Build tool
- **Tailwind CSS** + shadcn/ui
- **TanStack Query** - Data fetching
- **React Router DOM** - Routing

</td>
<td width="50%">

### Backend
- **Express.js** + TypeScript
- **Prisma** - ORM
- **PostgreSQL** - Database
- **JWT** - Authentication
- **Python Services** - AI/ML

</td>
</tr>
</table>

---

## 📂 Cấu trúc dự án

```
tbu-schedule-management/
├── 📄 README.md                 # Tài liệu chính
├── 📄 AGENTS.md                 # Hướng dẫn cho AI agents
├── 📄 .env.example              # Mẫu biến môi trường
│
├── 📁 src/                      # Frontend React
│   ├── components/              # React components
│   ├── pages/                   # Page components
│   ├── services/                # API services
│   ├── hooks/                   # Custom hooks
│   └── contexts/                # React contexts
│
├── 📁 backend/                  # Backend Express
│   ├── src/                     # Source code
│   │   ├── controllers/         # Request handlers
│   │   ├── services/            # Business logic
│   │   ├── routes/              # API routes
│   │   └── middleware/          # Express middleware
│   └── prisma/                  # Database schema
│
├── 📁 python_service/           # AI Service (RAG Chatbot)
├── 📁 python_tts_service/       # Text-to-Speech Service
│
├── 📁 docs/                     # 📚 Tài liệu
│   ├── setup/                   # Hướng dẫn cài đặt
│   ├── architecture/            # Kiến trúc hệ thống
│   ├── features/                # Tài liệu tính năng
│   ├── api/                     # API documentation
│   └── guides/                  # Hướng dẫn sử dụng
│
└── 📁 scripts/                  # Scripts automation
    ├── start-dev.ps1            # Start all services
    └── start-rag.bat            # Start RAG service
```

---

## ⚡ Cài đặt & Chạy Local (Development)

### Yêu cầu
- [Node.js](https://nodejs.org/) v18+ (LTS)
- [Python](https://python.org/) 3.10+
- [PostgreSQL](https://www.postgresql.org/)

### 1️⃣ Clone & Cài đặt

```bash
# Clone repository
git clone https://github.com/longtran592005/l-ch-c-ng-t-c-tbu.git
cd l-ch-c-ng-t-c-tbu

# Cài đặt dependencies
npm install
cd backend && npm install && cd ..
```

### 2️⃣ Cấu hình môi trường

```bash
# Frontend
cp .env.example .env

# Backend
cp backend/.env.example backend/.env
# Nhớ cài đặt DATABASE_URL trong backend/.env trỏ tới PostgreSQL của bạn
```

### 3️⃣ Setup Database

```bash
cd backend
npx prisma migrate dev
npx prisma db seed  # Tạo tài khoản admin mặc định
cd ..
```

### 4️⃣ Chạy ứng dụng

```bash
# Chạy Frontend (http://localhost:8080)
npm run dev:frontend

# Mở terminal mới, chạy Backend (https://localhost:3000)
npm run dev:backend
```

---

## 🚀 Triển khai Server (Production)

Hệ thống cung cấp sẵn script triển khai tự động cực kỳ đơn giản qua **Docker Compose + Nginx**. Toàn bộ app sẽ chạy trên 1 cổng duy nhất (80/443), tự động cấu hình proxy và chứng chỉ SSL Let's Encrypt.

### Yêu cầu Server
- OS: **Ubuntu 22.04 / 24.04**
- RAM: Tối thiểu 2GB
- Đã trỏ Domain về IP của Server.

### Bước 1: Tải mã nguồn lên Server

```bash
ssh root@<IP_CỦA_SERVER>
git clone https://github.com/longtran592005/l-ch-c-ng-t-c-tbu.git /root/tbu-schedule
cd /root/tbu-schedule
```

### Bước 2: Chạy Script Triển Khai (Duy nhất 1 lệnh)

Tất cả đã được tự động hóa. Bạn chỉ cần chạy:

```bash
chmod +x deploy.sh
./deploy.sh
```

**Script `deploy.sh` sẽ tự động làm mọi thứ:**
1. Kiểm tra và cài đặt **Docker** + **Docker Compose**.
2. Tạo file cấu hình từ template (Script sẽ tạm dừng để bạn thiết lập Database Password và Domain).
3. Build toàn bộ Docker Images siêu tốc.
4. Chạy Database Migrations và tạo Database tự động.
5. Xin chứng chỉ **SSL HTTPS** hoàn toàn miễn phí từ Let's Encrypt cho Domain của bạn.
6. Cài đặt tự động gia hạn SSL (Cronjob).

Triển khai xong, hãy truy cập: `https://ten-mien-cua-ban.com`

> **Lưu ý:** Nếu bạn nâng cấp code sau này, chỉ cần chạy lại `docker compose up -d --build` trên server để cập nhật không gián đoạn.

### 👤 Tài khoản mặc định sau khi deploy:
- **Admin**: `admin@tbu.edu.vn` / `123456`
- **Ban Giám Hiệu**: `bgh@tbu.edu.vn` / `123456`
- **Nhân viên**: `staff@tbu.edu.vn` / `123456`

---

## 📚 Tài liệu

| Tài liệu | Mô tả |
|----------|-------|
| [Kiến trúc hệ thống](./docs/architecture/ARCHITECTURE.md) | Mô tả tổng quan kiến trúc |
| [API Documentation](./docs/api/API_DOCUMENTATION.md) | Chi tiết các API endpoints |
| [Hướng dẫn sử dụng](./docs/guides/USER_GUIDE.md) | Hướng dẫn cho người dùng cuối |
| [Hướng dẫn cài đặt](./docs/setup/DEVELOPMENT.md) | Chi tiết cài đặt development |
| [AI Integration](./docs/features/AI_INTEGRATION_GUIDE.md) | Tích hợp AI/Chatbot |

---

## 🧪 Testing

```bash
# Backend tests
cd backend
npm run test
npm run test:coverage
```

---

## 📜 License

© 2025 Thai Binh University. All rights reserved.
