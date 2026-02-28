# TBU Schedule Management - Backend API

Backend API cho hệ thống Quản lý Lịch Công Tác Trường Đại học Thái Bình.

## 🚀 Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT (Access + Refresh Token)
- **Validation**: Zod + express-validator
- **Security**: bcrypt, helmet, rate-limiting

## 📋 Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 14
- npm hoặc yarn

## 🔧 Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

For local development, environment variables are now managed in the project's root `docker-compose.yml` file.

For production or manual setups, you will need a `.env` file with the following variables, especially the `DATABASE_URL` for PostgreSQL:
```env
DATABASE_URL="postgresql://prisma_user:StrongPassword123!@localhost:5432/tbu_schedule_db"
JWT_SECRET="your-super-secret-jwt-key-at-least-32-chars"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-at-least-32-chars"
# ... other variables
```

**Quan trọng**: Đổi `JWT_SECRET` và `JWT_REFRESH_SECRET` trong production!

### 3. Setup Database

When using the Docker setup, these commands should be executed inside the backend container.

```bash
# Generate Prisma Client
npm run prisma:generate

# Push the schema to the database (creates tables)
# Use this for the first setup in a new dev environment
npm run prisma:db:push

# (Optional) Seed database với dữ liệu mẫu
npm run prisma:seed
```
*Note: The `prisma:db:push` script would need to be added to package.json, e.g., `"prisma:db:push": "prisma db push"`*

### 4. Start Development Server

```bash
npm run dev
```

Server sẽ chạy tại `http://localhost:3000`

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utilities
│   ├── app.ts           # Express app
│   └── server.ts        # Server entry
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── migrations/      # Migration files
└── tests/               # Test files
```

## 🗄️ Database Schema

Xem chi tiết tại [BACKEND_ARCHITECTURE.md](../docs/BACKEND_ARCHITECTURE.md#4-database-schema-design)

Chạy Prisma Studio để xem database:

```bash
npm run prisma:studio
```

## 🔐 Authentication

API sử dụng JWT authentication với Access Token và Refresh Token:

1. **Login**: `POST /api/auth/login`
   - Trả về `accessToken` và `refreshToken`
   - Access token hết hạn sau 15 phút
   - Refresh token hết hạn sau 7 ngày

2. **Refresh Token**: `POST /api/auth/refresh`
   - Gửi refresh token để lấy access token mới

3. **Protected Routes**: Thêm header
   ```
   Authorization: Bearer <accessToken>
   ```

## 📚 API Documentation

Xem chi tiết API endpoints tại [BACKEND_ARCHITECTURE.md](../docs/BACKEND_ARCHITECTURE.md#5-api-endpoints-design)

### Quick Reference

**Auth**
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Đăng xuất
- `GET /api/auth/me` - Lấy thông tin user

**Schedules**
- `GET /api/schedules` - Danh sách lịch
- `GET /api/schedules/approved` - Lịch đã duyệt (public)
- `POST /api/schedules` - Tạo lịch (require auth)
- `PUT /api/schedules/:id` - Cập nhật lịch
- `DELETE /api/schedules/:id` - Xóa lịch
- `POST /api/schedules/:id/approve` - Duyệt lịch

**Chatbot**
- `POST /api/chatbot/query` - Query chatbot

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test:coverage
```

## 🔒 Security Features

- ✅ JWT authentication (Access + Refresh tokens)
- ✅ Password hashing với bcrypt
- ✅ Rate limiting
- ✅ CORS protection
- ✅ Helmet.js security headers
- ✅ Input validation với Zod
- ✅ SQL injection prevention (Prisma)

## 📝 Scripts

```bash
# Development
npm run dev              # Start dev server với hot reload

# Build
npm run build            # Build TypeScript to JavaScript
npm start                # Start production server

# Database
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Run migrations (dev)
npm run prisma:migrate:deploy  # Deploy migrations (prod)
npm run prisma:studio    # Open Prisma Studio
npm run prisma:seed      # Seed database

# Testing & Linting
npm test                 # Run tests
npm run lint             # Lint code
npm run lint:fix         # Fix linting errors
```

## 🌍 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_SECRET` | JWT access token secret | Required |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | Required |
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment (development/production) | development |
| `CORS_ORIGIN` | Allowed CORS origin | http://localhost:8080 |

## 🚢 Deployment

A `Dockerfile` is included for containerized deployments. See the root `README_FIX.md` for instructions on using it with Docker Compose.

### Production Checklist

1. ✅ Đổi `JWT_SECRET` và `JWT_REFRESH_SECRET`
2. ✅ Set `NODE_ENV=production`
3. ✅ Setup PostgreSQL production database
4. ✅ Run migrations: `npm run prisma:migrate:deploy`
5. ✅ Build: `npm run build`
6. ✅ Start: `npm start`

### Docker (Optional)

```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📞 Support

Liên hệ: support@tbu.edu.vn

