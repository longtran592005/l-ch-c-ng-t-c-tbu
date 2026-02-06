# Hướng dẫn Phát triển

Tài liệu này dành cho các nhà phát triển muốn đóng góp vào dự án Hệ thống Quản lý Lịch công tác TBU.

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm hoặc yarn
- Microsoft SQL Server >= 2019

### Cài đặt dự án

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd l-ch-c-ng-t-c-tbu
   ```

2. **Cài đặt dependencies**
   ```bash
   # Frontend (root)
   npm install

   # Backend
   cd backend
   npm install
   ```

3. **Cấu hình môi trường**

   **Frontend** (tạo file `.env` ở root):
   ```env
   VITE_API_BASE_URL=http://localhost:3001/api
   ```

   **Backend** (tạo file `.env` trong `backend/`):
   ```env
   NODE_ENV=development
   PORT=3001
   API_PREFIX=/api
   DATABASE_URL="sqlserver://localhost:1433;database=tbu_schedule;trustServerCertificate=true"
   JWT_SECRET=your-super-secret-jwt-key-min-32-chars
   JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
   ```

4. **Setup database**
   ```bash
   cd backend
   npx prisma generate
   npx prisma db push
   npx prisma seed  # Optional: Seed database với dữ liệu mẫu
   ```

5. **Chạy development servers**

   Terminal 1 - Backend:
   ```bash
   cd backend
   npm run dev
   ```

   Terminal 2 - Frontend:
   ```bash
   npm run dev
   ```

   Frontend sẽ chạy tại `http://localhost:8080`, backend tại `http://localhost:3001`

## 📁 Cấu trúc dự án

```
l-ch-c-ng-t-c-tbu/
├── backend/                  # Backend API
│   ├── src/
│   │   ├── config/          # Cấu hình (DB, JWT, env)
│   │   ├── controllers/     # Route handlers
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   └── utils/           # Utilities
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── seed.ts          # Seed data
│   └── package.json
├── src/                     # Frontend
│   ├── components/         # React components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── chatbot/        # Chatbot AI
│   │   ├── meeting/        # Meeting records
│   │   ├── schedule/       # Schedule viewers
│   │   └── layout/         # Layout components
│   ├── contexts/          # React Context providers
│   ├── pages/             # Page components
│   ├── services/          # API services
│   ├── hooks/             # Custom hooks
│   ├── lib/               # Utilities
│   └── types/             # TypeScript types
├── docs/                  # Documentation
├── AGENTS.md              # Guide cho AI agents
├── README.md              # Project overview
└── package.json
```

## 🛠️ Quy trình phát triển

### 1. Tạo feature mới

**Frontend:**

1. Tạo component trong `src/components/`
2. Tạo page trong `src/pages/` (nếu cần)
3. Tạo Context provider (nếu cần state management)
4. Tạo API service trong `src/services/`
5. Thêm types trong `src/types/index.ts`

**Backend:**

1. Cập nhật Prisma schema (nếu cần DB change)
2. Run migration: `npx prisma migrate dev --name description`
3. Tạo service trong `backend/src/services/`
4. Tạo controller trong `backend/src/controllers/`
5. Tạo route trong `backend/src/routes/`
6. Export route từ `backend/src/routes/index.ts`

### 2. Coding Standards

Tuân thủ các quy tắc trong [AGENTS.md](./AGENTS.md):

- **Import order**: React, third-party, internal (sử dụng `@` alias)
- **Naming convention**:
  - Components: PascalCase (e.g., `UserProfile.tsx`)
  - Hooks: camelCase với `use` prefix (e.g., `useAuth.ts`)
  - Services: camelCase (e.g., `api.ts`)
  - Constants: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`)
- **TypeScript**: Sử dụng strict mode cho backend, relaxed cho frontend
- **Components**: Sử dụng Shadcn/ui patterns, forwardRef cho components có ref

### 3. Testing

**Frontend:**
```bash
npm run lint          # ESLint check
npm run typecheck     # TypeScript check
```

**Backend:**
```bash
npm run lint          # ESLint check
npm test              # Run Vitest tests
npm run test:coverage # Run tests with coverage
```

### 4. Database Operations

```bash
cd backend

# Tạo migration
npx prisma migrate dev --name add_new_field

# Push schema (development only)
npx prisma db push

# Generate Prisma Client
npx prisma generate

# Xem database GUI
npx prisma studio

# Seed database
npx prisma db seed
```

## 🐛 Debugging

### Frontend Debugging

1. Mở DevTools trong browser (F12)
2. Tìm errors trong Console tab
3. Check Network tab để xem API requests
4. Sử dụng React DevTools extension để debug React components

### Backend Debugging

1. Check terminal output
2. Sử dụng `console.log()` với prefix:
   ```javascript
   console.log('[Auth] User logged in:', user);
   ```
3. Sử dụng Prisma logging trong development:
   ```env
   LOG_LEVEL=debug
   ```

### Common Issues

**API Connection Error:**
- Đảm bảo backend đang chạy trên port 3001
- Check `VITE_API_BASE_URL` trong frontend .env
- Check CORS settings trong `backend/src/app.ts`

**Database Connection Error:**
- Đảm bảo SQL Server đang chạy
- Check connection string trong backend .env
- Thử kết nối với Prisma Studio: `npx prisma studio`

**TypeScript Errors:**
- Frontend: Relaxed TypeScript, có thể sử dụng `// @ts-ignore` nếu cần
- Backend: Strict mode, phải fix all TypeScript errors

## 📝 Commit Convention

Sử dụng conventional commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: Feature mới
- `fix`: Bug fix
- `docs`: Thay đổi documentation
- `style`: Code style (formatting, missing semi colons)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Thêm/sửa tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(auth): add refresh token support

- Implement refresh token rotation
- Add refresh token endpoint
- Update authentication middleware

Closes #123
```

```
fix(schedule): prevent duplicate schedules

Add unique constraint on schedule date and time range
```

## 🎯 Best Practices

### Frontend

1. **State Management**:
   - Server state: Sử dụng React Query
   - Global UI state: React Context
   - Local state: useState/useReducer

2. **Performance**:
   - Sử dụng lazy loading cho pages lớn
   - Implement pagination cho lists
   - Debounce search inputs
   - Memo expensive calculations với useMemo/useCallback

3. **Accessibility**:
   - Sử dụng semantic HTML
   - Add aria-labels cho buttons/icons
   - Keyboard navigation support

### Backend

1. **Security**:
   - Luôn validate input với Zod
   - Sử dụng prepared statements (Prisma tự động)
   - Hash passwords với bcrypt
   - Implement rate limiting
   - Never expose sensitive data in responses

2. **Error Handling**:
   - Sử dụng try-catch trong controllers
   - Pass errors to error middleware
   - Return descriptive error messages
   - Log errors for debugging

3. **Database**:
   - Sử dụng transactions cho multi-step operations
   - Add indexes cho frequently queried fields
   - Use pagination cho large datasets

## 📚 Tài liệu bổ sung

- [AGENTS.md](./AGENTS.md) - Guide cho AI agents
- [README.md](./README.md) - Project overview
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System architecture
- [docs/API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md) - API endpoints
- [docs/USER_GUIDE.md](./docs/USER_GUIDE.md) - User guide

## 🆘 Getting Help

Nếu bạn gặp vấn đề:

1. Check documentation trong thư mục `docs/`
2. Search existing issues trên GitHub
3. Tạo new issue với:
   - Mô tả chi tiết vấn đề
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots/logs nếu có
   - Environment details (OS, Node version, browser)

## 🚢 Deployment

Xem hướng dẫn deployment trong [backend/README.md](./backend/README.md) và production checklist.

---

**Last updated:** January 2025
