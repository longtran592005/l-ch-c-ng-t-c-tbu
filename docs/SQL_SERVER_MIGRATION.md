# Hướng dẫn Chuyển đổi sang SQL Server

## ✅ Có thể dùng SQL Server

Prisma hỗ trợ SQL Server từ version 2.10.0+, vậy nên hoàn toàn có thể dùng SQL Server thay cho PostgreSQL.

---

## ⚠️ Vấn đề chính: Array Types

**SQL Server không hỗ trợ array types** như PostgreSQL. Trong schema hiện tại có 3 fields dùng `String[]`:

1. `Schedule.participants` - String[]
2. `Schedule.cooperatingUnits` - String[]
3. `Announcement.attachments` - String[]

---

## 🔧 Giải pháp

### Giải pháp 1: Dùng JSON Type (Khuyến nghị)

SQL Server hỗ trợ JSON từ version 2016+, Prisma có thể map `Json` type.

**Ưu điểm:**
- ✅ Đơn giản, ít thay đổi code
- ✅ Dễ migrate từ PostgreSQL
- ✅ Prisma tự động serialize/deserialize

**Nhược điểm:**
- ❌ Khó query array items trực tiếp trong SQL
- ❌ Không có indexes trên array items

### Giải pháp 2: Normalized Tables (Normalized Approach)

Tạo junction tables để lưu arrays.

**Ưu điểm:**
- ✅ Query linh hoạt
- ✅ Có thể index
- ✅ Normalized data structure

**Nhược điểm:**
- ❌ Phức tạp hơn
- ❌ Nhiều tables hơn
- ❌ Cần thay đổi code nhiều hơn

---

## 📝 Schema cho SQL Server (Giải pháp 1: JSON)

### File: `backend/prisma/schema.sqlserver.prisma`

```prisma
// Prisma Schema for TBU Schedule Management System
// Database: SQL Server

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlserver"
  url      = env("DATABASE_URL")
}

// ============================================
// USERS
// ============================================

enum UserRole {
  admin
  ban_giam_hieu
  staff
  viewer
}

enum UserStatus {
  active
  inactive
  suspended
}

model User {
  id           String      @id @default(uuid())
  email        String      @unique @db.NVarChar(255)
  passwordHash String      @map("password_hash") @db.NVarChar(255)
  name         String      @db.NVarChar(255)
  role         UserRole    @default(viewer)
  department   String?     @db.NVarChar(255)
  position     String?     @db.NVarChar(255)
  phone        String?     @db.NVarChar(20)
  avatar       String?     @db.NText
  status       UserStatus  @default(active)
  
  // Relations
  createdSchedules    Schedule[]          @relation("ScheduleCreator")
  approvedSchedules   Schedule[]          @relation("ScheduleApprover")
  scheduleApprovals   ScheduleApproval[]
  createdNews         News[]
  createdAnnouncements Announcement[]
  notifications       Notification[]
  refreshTokens       RefreshToken[]
  
  // Timestamps
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  lastLoginAt DateTime? @map("last_login_at")
  
  @@index([email])
  @@index([role])
  @@index([status])
  @@map("users")
}

// ============================================
// SCHEDULES
// ============================================

enum ScheduleStatus {
  draft
  pending
  approved
  cancelled
}

model Schedule {
  id               String          @id @default(uuid())
  date             DateTime        @db.Date
  dayOfWeek        String          @map("day_of_week") @db.NVarChar(20)
  startTime        String          @map("start_time") @db.Time
  endTime          String          @map("end_time") @db.Time
  content          String          @db.NText
  location         String          @db.NVarChar(500)
  leader           String          @db.NVarChar(255)
  participants     Json            @default("[]") // Changed from String[] to Json
  preparingUnit    String          @map("preparing_unit") @db.NVarChar(255)
  cooperatingUnits Json?           @map("cooperating_units") @default("[]") // Changed from String[] to Json
  status           ScheduleStatus  @default(draft)
  notes            String?         @db.NText
  
  // Relations
  createdBy    String   @map("created_by")
  creator      User     @relation("ScheduleCreator", fields: [createdBy], references: [id])
  approvedBy   String?  @map("approved_by")
  approver     User?    @relation("ScheduleApprover", fields: [approvedBy], references: [id])
  
  approvals    ScheduleApproval[]
  
  // Timestamps
  createdAt  DateTime  @default(now()) @map("created_at")
  updatedAt  DateTime  @updatedAt @map("updated_at")
  approvedAt DateTime? @map("approved_at")
  
  @@index([date])
  @@index([status])
  @@index([leader])
  @@index([createdBy])
  @@index([date, status])
  @@map("schedules")
}

// ============================================
// SCHEDULE APPROVALS (Audit Trail)
// ============================================

model ScheduleApproval {
  id            String         @id @default(uuid())
  scheduleId    String         @map("schedule_id")
  schedule      Schedule       @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  approvedBy    String         @map("approved_by")
  approver      User           @relation(fields: [approvedBy], references: [id])
  approvedAt    DateTime       @default(now()) @map("approved_at")
  previousStatus ScheduleStatus? @map("previous_status")
  newStatus     ScheduleStatus @map("new_status")
  notes         String?        @db.NText
  
  @@index([scheduleId])
  @@index([approvedBy])
  @@map("schedule_approvals")
}

// ============================================
// NEWS
// ============================================

enum NewsCategory {
  news
  announcement
  event
}

model News {
  id          String       @id @default(uuid())
  title       String       @db.NVarChar(500)
  summary     String?      @db.NText
  content     String       @db.NText
  image       String?      @db.NText
  category    NewsCategory
  authorId    String?      @map("author_id")
  author      User?        @relation(fields: [authorId], references: [id])
  authorName  String?      @map("author_name") @db.NVarChar(255) // Denormalized
  views       Int          @default(0)
  publishedAt DateTime     @default(now()) @map("published_at")
  createdAt   DateTime     @default(now()) @map("created_at")
  updatedAt   DateTime     @updatedAt @map("updated_at")
  
  @@index([category])
  @@index([publishedAt(sort: Desc)])
  @@map("news")
}

// ============================================
// ANNOUNCEMENTS
// ============================================

enum AnnouncementPriority {
  normal
  important
  urgent
}

model Announcement {
  id          String               @id @default(uuid())
  title       String               @db.NVarChar(500)
  content     String               @db.NText
  priority    AnnouncementPriority @default(normal)
  publishedAt DateTime             @default(now()) @map("published_at")
  expiresAt   DateTime?            @map("expires_at")
  attachments Json                 @default("[]") // Changed from String[] to Json
  createdBy   String?              @map("created_by")
  creator     User?                @relation(fields: [createdBy], references: [id])
  createdAt   DateTime             @default(now()) @map("created_at")
  updatedAt   DateTime             @updatedAt @map("updated_at")
  
  @@index([priority])
  @@index([publishedAt(sort: Desc)])
  @@index([expiresAt])
  @@map("announcements")
}

// ============================================
// NOTIFICATIONS
// ============================================

model Notification {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String   @db.NVarChar(255)
  message   String   @db.NText
  type      String   @db.NVarChar(50) // 'schedule_approved', 'schedule_pending', etc.
  linkedType String?  @map("linked_type") @db.NVarChar(50) // 'schedule', 'news', 'announcement'
  linkedId  String?  @map("linked_id") @db.UniqueIdentifier
  read      Boolean  @default(false)
  createdAt DateTime @default(now()) @map("created_at")
  
  @@index([userId])
  @@index([userId, read])
  @@index([createdAt(sort: Desc)])
  @@map("notifications")
}

// ============================================
// REFRESH TOKENS
// ============================================

model RefreshToken {
  id        String    @id @default(uuid())
  userId    String    @map("user_id")
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String    @unique @db.NVarChar(500)
  expiresAt DateTime  @map("expires_at")
  revoked   Boolean   @default(false)
  createdAt DateTime  @default(now()) @map("created_at")
  revokedAt DateTime? @map("revoked_at")
  
  @@index([userId])
  @@index([token])
  @@index([expiresAt])
  @@map("refresh_tokens")
}
```

---

## 🔄 Thay đổi so với PostgreSQL Schema

### 1. Datasource Provider
```prisma
// PostgreSQL
provider = "postgresql"

// SQL Server
provider = "sqlserver"
```

### 2. Array Types → JSON
```prisma
// PostgreSQL
participants     String[]        @default([])
cooperatingUnits String[]        @default([])

// SQL Server
participants     Json            @default("[]")
cooperatingUnits Json?           @default("[]")
```

### 3. Data Types
```prisma
// PostgreSQL → SQL Server
VARCHAR → NVarChar
TEXT → NText
UUID → UniqueIdentifier (cho linkedId)
```

### 4. UUID Generation
SQL Server dùng `NEWID()` thay vì `gen_random_uuid()`, nhưng Prisma tự động xử lý.

---

## 📝 Connection String cho SQL Server

### Format

```env
# SQL Server Authentication
DATABASE_URL="sqlserver://server:port;database=tbu_schedule_db;user=sa;password=your_password;encrypt=true;trustServerCertificate=true"

# Windows Authentication
DATABASE_URL="sqlserver://server:port;database=tbu_schedule_db;integratedSecurity=true;encrypt=true;trustServerCertificate=true"
```

### Ví dụ cụ thể

```env
# SQL Server Local với SQL Auth
DATABASE_URL="sqlserver://localhost:1433;database=tbu_schedule_db;user=sa;password=YourPassword123;encrypt=true;trustServerCertificate=true"

# SQL Server Azure
DATABASE_URL="sqlserver://your-server.database.windows.net:1433;database=tbu_schedule_db;user=your_user@server;password=your_password;encrypt=true"
```

---

## 🔧 Cách Chuyển đổi

### Bước 1: Cài đặt SQL Server

**Windows:**
- Download SQL Server Express (free): https://www.microsoft.com/sql-server/sql-server-downloads
- Hoặc SQL Server Developer Edition (free for dev)

**macOS/Linux:**
- Dùng Docker: `docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=YourPassword123" -p 1433:1433 mcr.microsoft.com/mssql/server:2022-latest`

### Bước 2: Tạo Database

```sql
CREATE DATABASE tbu_schedule_db;
GO
```

### Bước 3: Thay đổi Schema

1. Backup schema hiện tại:
   ```bash
   cp backend/prisma/schema.prisma backend/prisma/schema.postgresql.prisma
   ```

2. Thay đổi `schema.prisma`:
   - Đổi `provider = "postgresql"` → `provider = "sqlserver"`
   - Đổi `String[]` → `Json` cho các array fields
   - Đổi data types nếu cần (VARCHAR → NVarChar, TEXT → NText)

3. Update `.env`:
   ```env
   DATABASE_URL="sqlserver://localhost:1433;database=tbu_schedule_db;user=sa;password=YourPassword;encrypt=true;trustServerCertificate=true"
   ```

### Bước 4: Generate Prisma Client & Migrate

```bash
cd backend

# Generate Prisma Client mới
npm run prisma:generate

# Tạo migration
npm run prisma:migrate

# Seed database
npm run prisma:seed
```

---

## 💻 Thay đổi Code (Nếu cần)

### Với JSON Type, Prisma tự động serialize/deserialize

**Code hiện tại (work với cả PostgreSQL và SQL Server):**

```typescript
// Tạo schedule
const schedule = await prisma.schedule.create({
  data: {
    participants: ['Ban Giám hiệu', 'Phòng Đào tạo'], // Array
    cooperatingUnits: ['Phòng KHCN'], // Array
    // ... other fields
  },
});

// Read schedule
const schedule = await prisma.schedule.findUnique({
  where: { id: '...' },
});
console.log(schedule.participants); // ['Ban Giám hiệu', 'Phòng Đào tạo'] - Array!
```

**Prisma tự động:**
- Serialize: `Array` → `JSON string` khi save
- Deserialize: `JSON string` → `Array` khi read

**✅ Không cần thay đổi code!**

---

## ⚖️ So sánh PostgreSQL vs SQL Server

| Tính năng | PostgreSQL | SQL Server |
|-----------|------------|------------|
| **Array Types** | ✅ Native support | ❌ Dùng JSON |
| **JSON Support** | ✅ JSONB (indexed) | ✅ JSON (2016+) |
| **Full-text Search** | ✅ Excellent | ✅ Good |
| **Cost** | ✅ Free & Open Source | ⚠️ License required (Express free) |
| **Performance** | ✅ Excellent | ✅ Excellent |
| **Windows Integration** | ⚠️ Good | ✅ Excellent |
| **Tooling** | pgAdmin, DBeaver | SSMS (excellent) |

---

## 🎯 Khuyến nghị

### Chọn SQL Server vì:
- ✅ Đã có SQL Server license (hoặc dùng bản miễn phí như Express, Developer)
- ✅ Môi trường Windows/Enterprise
- ✅ Cần tích hợp với Microsoft ecosystem (Active Directory, Excel, Power BI)
- ✅ Team quen với SQL Server

---

## 📞 Support

Nếu gặp vấn đề khi chuyển đổi:
1. Kiểm tra Prisma docs: https://www.prisma.io/docs/orm/overview/databases/sql-server
2. Kiểm tra SQL Server version (cần >= 2016 cho JSON support)
3. Kiểm tra connection string format

---

**Tóm lại**: ✅ **Có thể dùng SQL Server**, chỉ cần thay đổi schema và connection string. Prisma sẽ xử lý phần còn lại!


