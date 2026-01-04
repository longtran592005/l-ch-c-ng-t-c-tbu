# Tài liệu API Backend

Tài liệu này mô tả các endpoint của API backend.

**Lưu ý:** Có sự không nhất quán trong việc định nghĩa base path cho các route. Hầu hết được gắn vào root (`/`), nhưng một số lại có prefix (ví dụ `/auth`, `/api`). Để cho rõ ràng, tài liệu này sẽ ghi rõ full path dự kiến cho mỗi endpoint. Các endpoint được đánh dấu `[AUTH]` yêu cầu JWT token hợp lệ trong `Authorization` header.

---

## 1. Health Check

Dùng để kiểm tra trạng thái hoạt động của server.

- **`GET /health`**
  - **Mô tả:** Trả về trạng thái "OK" nếu server đang chạy.
  - **Response (200 OK):**
    ```json
    {
      "status": "OK",
      "timestamp": "2024-01-01T12:00:00.000Z"
    }
    ```

---

## 2. Authentication (`/auth`)

Các endpoint liên quan đến xác thực người dùng.

- **`POST /auth/register`**
  - **Mô tả:** Đăng ký một tài khoản người dùng mới.
  - **Request Body:**
    ```json
    {
      "username": "testuser",
      "password": "password123",
      "email": "test@example.com",
      "fullName": "Test User"
    }
    ```
  - **Response (201 Created):**
    ```json
    {
      "message": "User registered successfully"
    }
    ```

- **`POST /auth/login`**
  - **Mô tả:** Đăng nhập và nhận về một JWT access token.
  - **Request Body:**
    ```json
    {
      "username": "testuser",
      "password": "password123"
    }
    ```
  - **Response (200 OK):**
    ```json
    {
      "accessToken": "ey...",
      "user": {
        "id": "...",
        "username": "testuser",
        "role": "USER"
      }
    }
    ```

---

## 3. Schedules (`/schedules`)

Quản lý lịch công tác.

- **`GET /schedules`**: Lấy danh sách tất cả lịch công tác. Hỗ trợ query params để lọc.
- **`POST /schedules`** `[AUTH]`: Tạo một lịch công tác mới.
- **`GET /schedules/:id`**: Lấy thông tin chi tiết của một lịch công tác theo ID.
- **`PUT /schedules/:id`** `[AUTH]`: Cập nhật thông tin một lịch công tác.
- **`DELETE /schedules/:id`** `[AUTH]`: Xóa một lịch công tác.
- **`POST /schedules/:id/approve`** `[AUTH]`: Phê duyệt một lịch công tác.

---

## 4. News (`/news`)

Quản lý tin tức.

- **`GET /news`**: Lấy danh sách tất cả tin tức.
- **`POST /news`** `[AUTH]`: Tạo một tin tức mới.
- **`GET /news/:id`**: Lấy thông tin chi tiết của một tin tức theo ID.
- **`PUT /news/:id`** `[AUTH]`: Cập nhật một tin tức.
- **`DELETE /news/:id`** `[AUTH]`: Xóa một tin tức.

---

## 5. Announcements (`/announcements`)

Quản lý thông báo.

- **`GET /announcements`**: Lấy danh sách tất cả thông báo.
- **`POST /announcements`** `[AUTH]`: Tạo một thông báo mới.
- **`GET /announcements/:id`**: Lấy thông tin chi tiết của một thông báo theo ID.
- **`PUT /announcements/:id`** `[AUTH]`: Cập nhật một thông báo.
- **`DELETE /announcements/:id`** `[AUTH]`: Xóa một thông báo.

---

## 6. Meeting Records (`/meeting-records`)

Quản lý nội dung các cuộc họp.

- **`GET /meeting-records`**: Lấy danh sách tất cả nội dung cuộc họp.
- **`POST /meeting-records`** `[AUTH]`: Tạo một bản ghi nội dung cuộc họp mới.
- **`GET /meeting-records/:id`**: Lấy chi tiết một bản ghi theo ID.
- **`PUT /meeting-records/:id`** `[AUTH]`: Cập nhật một bản ghi.
- **`DELETE /meeting-records/:id`** `[AUTH]`: Xóa một bản ghi.
- **`GET /meeting-records/schedule/:scheduleId`**: Lấy các bản ghi cuộc họp theo ID của lịch công tác.
- **`POST /meeting-records/:id/upload-audio`** `[AUTH]`: Tải lên một file audio (dạng `multipart/form-data`) cho một bản ghi. Tên field là `audioFile`.
- **`POST /meeting-records/:id/audio`** `[AUTH]`: Thêm metadata của một file ghi âm.
- **`DELETE /meeting-records/:id/audio/:audioIndex`** `[AUTH]`: Xóa một file ghi âm khỏi bản ghi.
- **`PUT /meeting-records/:id/content`** `[AUTH]`: Cập nhật phần nội dung text của biên bản.
- **`POST /meeting-records/:id/minutes`** `[AUTH]`: Tạo biên bản chi tiết cho cuộc họp (có thể là từ AI).

---

## 7. Users (`/api/users`)

Quản lý người dùng.

- **`PUT /api/users/:id`** `[AUTH]`: Cập nhật thông tin người dùng (ví dụ: profile, role).
