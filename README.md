# Hệ thống Quản lý Lịch công tác - Trường Đại học Thái Bình (TBU)

Đây là dự án ứng dụng web dùng để quản lý và hiển thị lịch công tác, tin tức, và các hoạt động nội bộ của Trường Đại học Thái Bình.

## ✨ Tính năng chính

### Người dùng công khai
- **Xem lịch công tác:** Tra cứu lịch công tác của trường theo giao diện tuần và tháng.
- **Đọc tin tức & thông báo:** Cập nhật các tin tức, sự kiện và thông báo mới nhất.
- **Tìm kiếm thông minh:** Lọc nhanh các bài viết tin tức theo từ khóa.
- **Trợ lý Chatbot:** Tra cứu nhanh lịch công tác bằng cách đặt câu hỏi cho trợ lý ảo.

### Quản trị viên
- **Quản lý CRUD:** Toàn quyền tạo, đọc, cập nhật, xóa các lịch công tác, tin tức, và thông báo.
- **Phê duyệt lịch:** Chức năng phê duyệt lịch công tác trước khi hiển thị công khai.
- **Quản lý nội dung cuộc họp:**
  - Ghi và chỉnh sửa biên bản chi tiết cho các cuộc họp.
  - Ghi âm trực tiếp hoặc tải lên các file audio.
  - Nghe lại và quản lý các file ghi âm.
  - Sử dụng AI để tự động tạo biên bản từ nội dung cuộc họp.

## 🚀 Công nghệ sử dụng

Dự án được xây dựng theo kiến trúc monorepo.

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Ngôn ngữ:** TypeScript
- **Styling:** Tailwind CSS & [shadcn/ui](https://ui.shadcn.com/)
- **Quản lý trạng thái:** React Context + TanStack Query
- **Routing:** React Router DOM

### Backend
- **Framework:** Node.js + Express.js
- **Ngôn ngữ:** TypeScript
- **ORM:** Prisma
- **Cơ sở dữ liệu:** SQL Server
- **Xác thực:** JSON Web Tokens (JWT)

## 📂 Cấu trúc dự án

- `backend/`: Mã nguồn cho Express.js server.
- `src/`: Mã nguồn cho React frontend.
- `docs/`: Nơi chứa các tài liệu của dự án.
- `prisma/` (bên trong `backend`): Chứa schema và migrations của cơ sở dữ liệu.

## ⚙️ Hướng dẫn Cài đặt và Chạy

### Yêu cầu
- [Node.js](https://nodejs.org/) (khuyến khích phiên bản LTS)
- [Bun](https://bun.sh/) (hoặc `npm`/`yarn`)
- [Docker](https://www.docker.com/) (để chạy CSDL nếu cần)

### 1. Cài đặt Backend

```bash
# 1. Đi đến thư mục backend
cd backend

# 2. Cài đặt các dependencies
npm install

# 3. Cấu hình biến môi trường
# Tạo file .env từ file .env.example và điền thông tin CSDL
cp .env.example .env
# Sửa file .env với thông tin kết nối DATABASE_URL

# 4. Chạy database migrations với Prisma
npx prisma migrate dev

# 5. Khởi động server backend
npm run dev
```
Server backend sẽ chạy tại `http://localhost:3000`.

### 2. Cài đặt Frontend

```bash
# 1. Từ thư mục gốc, cài đặt các dependencies
npm install

# 2. Khởi động development server cho frontend
npm run dev
```
Ứng dụng frontend sẽ chạy tại `http://localhost:8080`.

## 📚 Tài liệu

Dự án có các tài liệu chi tiết để giúp bạn hiểu rõ hơn về hệ thống:

- **[Kiến trúc hệ thống](./docs/ARCHITECTURE.md):** Mô tả tổng quan về kiến trúc frontend và backend.
- **[Tài liệu API](./docs/API_DOCUMENTATION.md):** Chi tiết về các API endpoints của backend.
- **[Hướng dẫn sử dụng](./docs/USER_GUIDE.md):** Hướng dẫn các tính năng từ góc độ người dùng cuối.

## ⚡ Tối ưu hóa Hiệu năng

Dự án đã được áp dụng các kỹ thuật tối ưu hóa hiệu năng, bao gồm:
- **Code Splitting:** Tải lười (lazy loading) các trang và components để giảm kích thước bundle ban đầu.
- **Memoization:** Sử dụng `React.memo`, `useMemo`, và `useCallback` để ngăn chặn các lần render không cần thiết.
- **Data Fetching:** Áp dụng `debounce` cho chức năng tìm kiếm và `optimistic updates` cho các hành động xóa để cải thiện trải nghiệm người dùng.
- **File Handling:** Cấu hình tải lười cho các file media.
