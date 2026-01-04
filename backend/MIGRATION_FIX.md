# Fix Migration Error P3006

## Vấn đề
Lỗi `P3006` xảy ra khi Prisma cố validate migrations trên shadow database nhưng shadow database không có table `schedules`.

## Giải pháp

### Cách 1: Sử dụng `prisma migrate deploy` (Khuyến nghị)

Nếu database đã có sẵn và bạn chỉ muốn apply migrations:

```bash
cd backend
npx prisma migrate deploy
```

Lệnh này sẽ:
- Apply tất cả migrations chưa được apply
- Không tạo shadow database
- Phù hợp cho production và development khi database đã có sẵn

### Cách 2: Sử dụng `prisma db push` (Cho development)

Nếu bạn muốn sync schema trực tiếp mà không dùng migrations:

```bash
cd backend
npx prisma db push
```

Lệnh này sẽ:
- Sync schema trực tiếp với database
- Không tạo migration files
- Phù hợp cho development khi bạn đang thay đổi schema thường xuyên

### Cách 3: Tắt shadow database (Đã cấu hình trong schema.prisma)

Đã cập nhật `schema.prisma` để không sử dụng shadow database. Bây giờ bạn có thể chạy:

```bash
cd backend
npx prisma migrate dev
```

**Lưu ý**: Tắt shadow database không được khuyến nghị cho production vì Prisma không thể validate migrations trước khi apply.

### Cách 4: Tạo shadow database riêng

Nếu bạn muốn giữ shadow database (khuyến nghị cho production):

1. Tạo database mới cho shadow:
   ```sql
   CREATE DATABASE tbu_schedule_db_shadow;
   ```

2. Thêm vào `.env`:
   ```env
   SHADOW_DATABASE_URL="sqlserver://localhost:1433;database=tbu_schedule_db_shadow;user=sa;password=your_password;trustServerCertificate=true"
   ```

3. Uncomment trong `schema.prisma`:
   ```prisma
   shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
   ```

## Khuyến nghị

- **Development**: Sử dụng `prisma db push` hoặc `prisma migrate deploy`
- **Production**: Tạo shadow database riêng và sử dụng `prisma migrate deploy`

