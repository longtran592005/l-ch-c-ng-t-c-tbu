# Tài liệu Kiến trúc Hệ thống

Tài liệu này mô tả kiến trúc tổng quan của dự án Lịch công tác TBU, bao gồm cả Frontend và Backend.

## 1. Tổng quan Công nghệ

Hệ thống được xây dựng dựa trên các công nghệ hiện đại và phổ biến, theo mô hình Monorepo chứa hai phần chính là Frontend và Backend.

- **Frontend:**
  - **Framework:** React 18 (sử dụng Vite làm build tool)
  - **Ngôn ngữ:** TypeScript
  - **Styling:** Tailwind CSS và thư viện component shadcn/ui
  - **Quản lý trạng thái:** React Context API và TanStack Query (React Query)
  - **Routing:** React Router DOM v6
- **Backend:**
  - **Framework:** Node.js với Express.js
  - **Ngôn ngữ:** TypeScript
  - **ORM:** Prisma
  - **Cơ sở dữ liệu:** SQL Server (dựa trên cấu hình Prisma)
  - **Xác thực:** JSON Web Tokens (JWT)
- **Môi trường:**
  - **Runtime:** Bun (dựa trên sự tồn tại của `bun.lockb`)
  - **Containerization:** Docker (với `docker-compose.yml`)

## 2. Cấu trúc Dự án

Dự án được tổ chức theo cấu trúc monorepo, với các thành phần chính nằm ở thư mục gốc:

```
l-ch-c-ng-t-c-tbu/
├── backend/         # Mã nguồn cho server (Node.js/Express)
├── docs/            # Thư mục chứa các tài liệu của dự án
├── public/          # Các tệp tĩnh cho frontend
├── src/             # Mã nguồn cho frontend (React)
├── .env             # Biến môi trường
├── package.json     # Quản lý dependencies và scripts cho frontend
├── tsconfig.json    # Cấu hình TypeScript chung
└── vite.config.ts   # Cấu hình Vite cho frontend
```

---

## 3. Kiến trúc Frontend

Frontend được xây dựng theo kiến trúc component-based hiện đại.

### 3.1. Cấu trúc thư mục `src`

- **`assets/`**: Chứa các tài sản tĩnh như hình ảnh, fonts.
- **`components/`**: Chứa các UI components có thể tái sử dụng.
  - **`ui/`**: Các components cơ bản được cung cấp bởi shadcn/ui (Button, Card, Input,...).
  - **`layout/`**: Các components định hình layout chính của trang (Header, Footer, MainLayout).
  - **`auth/`**: Components liên quan đến xác thực (ví dụ: `ProtectedRoute`).
  - **`chatbot/`**: Components cho chức năng chatbot.
  - **`meeting/`**: Components liên quan đến quản lý nội dung cuộc họp.
  - **`schedule/`**: Components để hiển thị lịch công tác.
- **`contexts/`**: Chứa các React Context providers để quản lý trạng thái toàn cục (ví dụ: `AuthContext`, `ScheduleContext`). Dữ liệu từ server được cache và quản lý bởi React Query, sau đó được cung cấp cho các components thông qua Context.
- **`hooks/`**: Chứa các custom hooks để tái sử dụng logic (ví dụ: `useDebounce`, `useIsMobile`).
- **`lib/`**: Các hàm tiện ích, ví dụ `utils.ts` của shadcn.
- **`pages/`**: Mỗi file là một trang (route) của ứng dụng. Cấu trúc file trong này ánh xạ trực tiếp đến URL của trang.
  - **`admin/`**: Các trang dành cho khu vực quản trị.
- **`services/`**: Chứa các module để tương tác với API của backend. Các hàm này thường sử dụng `fetch` hoặc `axios` để gửi request.
- **`types/`**: Định nghĩa các kiểu dữ liệu TypeScript chung cho toàn bộ frontend.

### 3.2. Luồng Dữ liệu (Data Flow)

1.  **Page Load**: Khi người dùng truy cập một URL, `React Router` sẽ render `page` component tương ứng.
2.  **Data Fetching**:
    - `page` component hoặc các child components của nó sẽ gọi các hàm trong `Context` (ví dụ `useSchedules()`).
    - `Context` provider (ví dụ `ScheduleProvider`) sẽ sử dụng `React Query` để gọi đến `service` API tương ứng (ví dụ `api.ts`).
    - `React Query` quản lý việc gọi API, caching, re-fetching và trạng thái loading/error.
3.  **State Management**:
    - Trạng thái server (dữ liệu từ API) được quản lý bởi `React Query`.
    - Trạng thái UI (ví dụ: mở/đóng modal, giá trị input) được quản lý bởi `useState` hoặc `useReducer` tại local component hoặc được nâng lên `Context` nếu cần chia sẻ giữa nhiều components.
4.  **Rendering**: Dữ liệu được truyền xuống các components con qua props và được render ra giao diện.

---

## 4. Kiến trúc Backend

Backend được xây dựng theo kiến trúc 3 lớp (3-Layer Architecture) kinh điển: **Routes -> Controllers -> Services**.

### 4.1. Cấu trúc thư mục `backend/src`

- **`config/`**: Chứa các file cấu hình cho ứng dụng (database, JWT, biến môi trường).
- **`controllers/`**: Lớp controller nhận request từ client, xác thực dữ liệu đầu vào (request body, params, query) và gọi đến lớp service tương ứng để xử lý logic.
- **`middleware/`**: Chứa các Express middleware, ví dụ như `auth.middleware.ts` để xác thực JWT token, `error.middleware.ts` để xử lý lỗi tập trung.
- **`routes/`**: Định nghĩa các API endpoints. Mỗi file tương ứng với một tài nguyên (resource) (ví dụ: `schedule.route.ts`, `user.route.ts`). File `index.ts` tổng hợp tất cả các routes.
- **`services/`**: Lớp service chứa toàn bộ business logic của ứng dụng. Nó được gọi bởi controller và tương tác trực tiếp với database thông qua Prisma Client.
- **`utils/`**: Chứa các hàm tiện ích được sử dụng lại ở nhiều nơi (ví dụ: xử lý bcrypt, JWT).
- **`prisma/`**: Chứa file `schema.prisma` định nghĩa database schema, các file migration, và file seed dữ liệu.

### 4.2. Luồng Xử lý Request

1.  Một request từ client được gửi đến một endpoint (ví dụ `/api/schedules`).
2.  **`server.ts`** và **`app.ts`** khởi tạo Express app và các middleware chung.
3.  Request được chuyển đến **`routes/index.ts`** và sau đó đến file route cụ thể (ví dụ **`routes/schedule.route.ts`**).
4.  Route gọi đến middleware (ví dụ `authMiddleware` để kiểm tra token).
5.  Nếu middleware pass, route gọi đến hàm xử lý trong **`controllers/schedule.controller.ts`**.
6.  Controller xác thực dữ liệu (nếu cần) và gọi hàm trong **`services/schedule.service.ts`**.
7.  Service thực hiện logic nghiệp vụ, sử dụng Prisma Client để truy vấn CSDL.
8.  Kết quả được trả về theo chuỗi ngược lại: Service -> Controller -> Client.
9.  Nếu có lỗi, lỗi sẽ được bắt và xử lý bởi `error.middleware.ts`.

### 4.3. Xác thực và Phân quyền

-   Hệ thống sử dụng **JWT** để xác thực.
-   Khi người dùng đăng nhập thành công, backend sẽ cấp một `accessToken`.
-   Client lưu `accessToken` (ví dụ trong `localStorage`) và gửi kèm trong `Authorization` header của mỗi request cần xác thực.
-   `auth.middleware.ts` ở backend sẽ kiểm tra tính hợp lệ của token trước khi cho phép request đi tiếp.
-   Phân quyền được thực hiện dựa trên vai trò (role) của người dùng được lưu trong payload của JWT.
