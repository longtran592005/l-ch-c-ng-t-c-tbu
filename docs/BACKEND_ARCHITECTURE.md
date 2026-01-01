# Backend Architecture - Hệ thống Quản lý Lịch Công Tác TBU

## 1. TỔNG QUAN KIẾN TRÚC

```
┌─────────────────┐
│   Frontend      │  React 18 + TypeScript + Vite
│   (Port 8080)   │
└────────┬────────┘
         │ HTTPS/REST API
         │
┌────────▼────────┐
│   Backend API   │  Node.js + Express + TypeScript
│   (Port 3000)   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐  ┌─▼──────┐
│SQL Server│ │Redis  │ (Optional: caching, sessions)
│ (Port    │ │(Port   │
│  1433)   │ │ 6379)  │
└─────────┘ └────────┘
```

## 2. LỰA CHỌN CÔNG NGHỆ

### 2.1. Framework: Express.js (thay vì NestJS)

**Lý do:**
- ✅ Đơn giản, dễ hiểu và maintain
- ✅ Cộng đồng lớn, nhiều middleware
- ✅ Phù hợp với team nhỏ, dự án vừa
- ✅ Linh hoạt, không ràng buộc kiến trúc
- ❌ NestJS phức tạp hơn, tốt cho dự án lớn/corporate

### 2.2. Database: SQL Server

**Lý do:**
- ✅ Phù hợp với môi trường Windows/Enterprise
- ✅ Tích hợp tốt với Microsoft ecosystem (Active Directory, Excel, Power BI)
- ✅ Cộng đồng lớn, công cụ mạnh mẽ (SSMS)
- ✅ Hiệu suất cao, ổn định

### 2.3. ORM: Prisma (thay vì TypeORM/Sequelize)

**Lý do:**
- ✅ Type-safe queries (match với TypeScript)
- ✅ Migration dễ dàng
- ✅ Schema-first approach (rõ ràng)
- ✅ Excellent DevEx (Prisma Studio)
- ✅ Auto-generated types

### 2.4. Authentication: JWT (Access + Refresh Token)

**Lý do:**
- ✅ Stateless (dễ scale)
- ✅ Không cần session storage
- ✅ Standard, widely used
- ✅ Refresh token để tăng security

## 3. CẤU TRÚC THƯ MỤC BACKEND

```
backend/
├── src/
│   ├── config/              # Configuration files
│   │   ├── database.ts      # Prisma client config
│   │   ├── env.ts           # Environment variables
│   │   └── jwt.ts           # JWT config
│   │
│   ├── prisma/              # Database schema & migrations
│   │   ├── schema.prisma    # Database schema
│   │   └── migrations/      # Migration files
│   │
│   ├── middleware/          # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── rateLimiter.middleware.ts
│   │   └── validator.middleware.ts
│   │
│   ├── controllers/         # Route handlers
│   │   ├── auth.controller.ts
│   │   ├── schedule.controller.ts
│   │   ├── user.controller.ts
│   │   ├── chatbot.controller.ts
│   │   ├── news.controller.ts
│   │   └── announcement.controller.ts
│   │
│   ├── services/            # Business logic
│   │   ├── auth.service.ts
│   │   ├── schedule.service.ts
│   │   ├── user.service.ts
│   │   ├── chatbot.service.ts
│   │   └── notification.service.ts
│   │
│   ├── models/              # Type definitions
│   │   └── types.ts
│   │
│   ├── utils/               # Utilities
│   │   ├── jwt.util.ts
│   │   ├── bcrypt.util.ts
│   │   ├── date.util.ts
│   │   └── errors.util.ts
│   │
│   ├── routes/              # Express routes
│   │   ├── index.ts
│   │   ├── auth.routes.ts
│   │   ├── schedule.routes.ts
│   │   ├── user.routes.ts
│   │   ├── chatbot.routes.ts
│   │   └── public.routes.ts
│   │
│   └── app.ts               # Express app setup
│   └── server.ts            # Server entry point
│
├── tests/                   # Test files
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## 4. DATABASE SCHEMA DESIGN

The database schema is defined using Prisma in `backend/prisma/schema.prisma`. It is designed to be compatible with SQL Server and includes models for Users, Schedules, Schedule Approvals, News, Announcements, Notifications, and Refresh Tokens.

Detailed schema definitions can be found in `backend/prisma/schema.prisma`.

## 5. API ENDPOINTS DESIGN

### 5.1. Authentication Routes (`/api/auth`)

```
POST   /api/auth/login           # Đăng nhập (email, password) → access + refresh token
POST   /api/auth/refresh         # Refresh access token (refresh_token) → new access token
POST   /api/auth/logout          # Đăng xuất (revoke refresh token)
GET    /api/auth/me              # Lấy thông tin user hiện tại
POST   /api/auth/change-password # Đổi mật khẩu
```

### 5.2. Schedule Routes (`/api/schedules`)

```
GET    /api/schedules                    # Lấy danh sách lịch (với filters, pagination)
GET    /api/schedules/approved           # Lấy lịch đã duyệt (public)
GET    /api/schedules/:id                # Lấy chi tiết lịch
POST   /api/schedules                    # Tạo lịch mới (require: admin/bgh)
PUT    /api/schedules/:id                # Cập nhật lịch (require: admin/bgh/creator)
DELETE /api/schedules/:id                # Xóa lịch (require: admin/bgh/creator)
POST   /api/schedules/:id/approve        # Duyệt lịch (require: admin/bgh)
POST   /api/schedules/:id/cancel         # Hủy lịch (require: admin/bgh)
GET    /api/schedules/export/csv         # Export CSV (query: week, month, year)
GET    /api/schedules/calendar           # Lấy lịch theo khoảng thời gian (for calendar view)
```

### 5.3. Chatbot Routes (`/api/chatbot`)

```
POST   /api/chatbot/query               # Chatbot query (message, context) → response
GET    /api/chatbot/suggestions         # Lấy câu hỏi gợi ý
```

### 5.4. User Routes (`/api/users`) - Admin only

```
GET    /api/users                       # Danh sách users (pagination, filters)
GET    /api/users/:id                   # Chi tiết user
POST   /api/users                       # Tạo user mới
PUT    /api/users/:id                   # Cập nhật user
DELETE /api/users/:id                   # Xóa user (soft delete)
PUT    /api/users/:id/status            # Thay đổi status (active/inactive)
```

### 5.5. News Routes (`/api/news`)

```
GET    /api/news                        # Danh sách tin tức (public, pagination)
GET    /api/news/:id                    # Chi tiết tin tức (public)
POST   /api/news                        # Tạo tin tức (require: admin/bgh)
PUT    /api/news/:id                    # Cập nhật tin tức
DELETE /api/news/:id                    # Xóa tin tức
```

### 5.6. Announcements Routes (`/api/announcements`)

```
GET    /api/announcements               # Danh sách thông báo (public, active only)
GET    /api/announcements/:id           # Chi tiết thông báo (public)
POST   /api/announcements               # Tạo thông báo (require: admin/bgh)
PUT    /api/announcements/:id           # Cập nhật thông báo
DELETE /api/announcements/:id           # Xóa thông báo
```

### 5.7. Notifications Routes (`/api/notifications`)

```
GET    /api/notifications               # Lấy notifications của user
PUT    /api/notifications/:id/read      # Đánh dấu đã đọc
PUT    /api/notifications/read-all      # Đánh dấu tất cả đã đọc
GET    /api/notifications/unread-count  # Đếm số chưa đọc
```

## 6. RESPONSE FORMAT STANDARD

### 6.1. Success Response

```typescript
{
  success: true,
  data: T, // Generic type
  message?: string,
  meta?: {
    pagination?: {
      page: number,
      limit: number,
      total: number,
      totalPages: number
    }
  }
}
```

### 6.2. Error Response

```typescript
{
  success: false,
  error: {
    code: string,        // 'UNAUTHORIZED', 'VALIDATION_ERROR', etc.
    message: string,
    details?: any        // Validation errors, stack trace (dev only)
  }
}
```

## 7. AUTHENTICATION FLOW

```
1. User login → POST /api/auth/login
   ↓
2. Backend verify email/password → Generate JWT tokens
   ↓
3. Return: { accessToken, refreshToken, expiresIn }
   ↓
4. Frontend store tokens (httpOnly cookies hoặc memory)
   ↓
5. Attach accessToken to subsequent requests (Authorization: Bearer <token>)
   ↓
6. When accessToken expires → POST /api/auth/refresh (với refreshToken)
   ↓
7. Backend validate refreshToken → Generate new accessToken
```

## 8. SECURITY CONSIDERATIONS

### 8.1. Password Security
- Bcrypt hashing (10 rounds minimum)
- Password strength requirements (min 8 chars, mix of chars)

### 8.2. JWT Security
- Access token: 15 minutes expiry
- Refresh token: 7 days expiry
- Store refresh tokens in database (revocable)
- HTTP-only cookies for refresh tokens (prevent XSS)

### 8.3. Rate Limiting
- Login endpoint: 5 requests/minute per IP
- General API: 100 requests/minute per user
- Chatbot: 20 requests/minute per user

### 8.4. CORS
- Allow specific origins only
- Credentials: true

### 8.5. Input Validation
- Use Zod schema validation
- Sanitize user inputs
- SQL injection prevention (Prisma handles this)

### 8.6. CSRF Protection
- CSRF tokens for state-changing operations
- SameSite cookies

## 9. DEPLOYMENT CONSIDERATIONS

### 9.1. Environment Variables
```env
# Database
DATABASE_URL=sqlserver://localhost:1433;database=tbu_schedule_db;user=sa;password=YourPassword;trustServerCertificate=true

# JWT
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Server
PORT=3000
NODE_ENV=production

# CORS
CORS_ORIGIN=http://localhost:8080

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### 9.2. Docker Setup (Recommended)
- Dockerfile for backend
- docker-compose.yml (backend + mssql)
- Health checks

## 10. NEXT STEPS

1. ✅ Setup Prisma schema (schema.prisma)
2. ✅ Create database migrations
3. ✅ Setup Express server structure
4. ✅ Implement authentication endpoints
5. ✅ Implement schedule CRUD endpoints
6. ✅ Implement chatbot endpoint
7. ✅ Add middleware (auth, error, rate limit)
8. ✅ Write tests
9. ✅ Documentation (API docs with Swagger)

