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
│PostgreSQL│ │Redis  │ (Optional: caching, sessions)
│ (Port    │ │(Port   │
│  5432)   │ │ 6379)  │
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

### 2.2. Database: PostgreSQL

**Lý do:**
- ✅ ACID compliance (quan trọng cho quản lý lịch)
- ✅ JSONB support (lưu participants array, cooperatingUnits)
- ✅ Full-text search (tìm kiếm lịch nâng cao)
- ✅ Mature, stable
- ✅ Hỗ trợ tốt từ Node.js

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

### 4.1. Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'ban_giam_hieu', 'staff', 'viewer')),
  department VARCHAR(255),
  position VARCHAR(255),
  phone VARCHAR(20),
  avatar TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
```

### 4.2. Schedules Table

```sql
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  day_of_week VARCHAR(20) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  content TEXT NOT NULL,
  location VARCHAR(500) NOT NULL,
  leader VARCHAR(255) NOT NULL,
  participants TEXT[] DEFAULT '{}', -- Array of strings
  preparing_unit VARCHAR(255) NOT NULL,
  cooperating_units TEXT[] DEFAULT '{}', -- Array of strings
  status VARCHAR(20) NOT NULL DEFAULT 'draft' 
    CHECK (status IN ('draft', 'pending', 'approved', 'cancelled')),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP
);

CREATE INDEX idx_schedules_date ON schedules(date);
CREATE INDEX idx_schedules_status ON schedules(status);
CREATE INDEX idx_schedules_leader ON schedules(leader);
CREATE INDEX idx_schedules_created_by ON schedules(created_by);
CREATE INDEX idx_schedules_date_status ON schedules(date, status);
-- Full-text search index
CREATE INDEX idx_schedules_content_search ON schedules USING gin(to_tsvector('vietnamese', content));
```

### 4.3. Schedule Approvals (Audit Trail)

```sql
CREATE TABLE schedule_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  approved_by UUID NOT NULL REFERENCES users(id),
  approved_at TIMESTAMP DEFAULT NOW(),
  previous_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  notes TEXT
);

CREATE INDEX idx_approvals_schedule_id ON schedule_approvals(schedule_id);
CREATE INDEX idx_approvals_approved_by ON schedule_approvals(approved_by);
```

### 4.4. News Table

```sql
CREATE TABLE news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  summary TEXT,
  content TEXT NOT NULL,
  image TEXT,
  category VARCHAR(20) NOT NULL CHECK (category IN ('news', 'announcement', 'event')),
  author_id UUID REFERENCES users(id),
  author_name VARCHAR(255), -- Denormalized for performance
  views INTEGER DEFAULT 0,
  published_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_news_category ON news(category);
CREATE INDEX idx_news_published_at ON news(published_at DESC);
CREATE INDEX idx_news_title_search ON news USING gin(to_tsvector('vietnamese', title));
```

### 4.5. Announcements Table

```sql
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),
  published_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  attachments TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_announcements_priority ON announcements(priority);
CREATE INDEX idx_announcements_published_at ON announcements(published_at DESC);
CREATE INDEX idx_announcements_expires_at ON announcements(expires_at);
```

### 4.6. Notifications Table

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'schedule_approved', 'schedule_pending', etc.
  linked_type VARCHAR(50), -- 'schedule', 'news', 'announcement'
  linked_id UUID,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

### 4.7. Refresh Tokens Table

```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
```

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
DATABASE_URL=postgresql://user:password@localhost:5432/tbu_schedule_db

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
- docker-compose.yml (backend + postgres)
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

