# 🚀 Hướng Dẫn Chạy Dự Án (Updated)

Dưới đây là hướng dẫn chi tiết để chạy toàn bộ hệ thống sau khi đã cập nhật Whisper AI mới.

## 1. Cài đặt Môi Trường (Prerequisites)

Đảm bảo bạn đã cài đặt:
- **Node.js** (v18 trở lên)
- **Python** (v3.10 trở lên)
- **Docker Desktop** (cho Database)
- **Git**

---

## 2. Cấu hình Database (SQL Server)

Dự án sử dụng **SQL Server** chạy trực tiếp trên máy (Native/Local).

1.  Đảm bảo **SQL Server** đã bật và hoạt động.
2.  Kiểm tra file `.env` trong thư mục `backend` để đảm bảo thông tin kết nối đúng với cấu hình máy bạn:
    ```env
    # Ví dụ connection string (kiểm tra username/password của bạn)
    DATABASE_URL="sqlserver://localhost:1433;database=tbu_schedule_db;user=sa;password=yourPassword;trustServerCertificate=true"
    ```
3.  Nếu Database chưa có bảng, chạy lệnh đồng bộ:
    ```powershell
    cd backend
    npx prisma db push
    ```

---

## 3. Cài đặt & Cấu hình Python Whisper (Quan trọng)

Bạn cần cài đặt môi trường Python cho module nhận dạng giọng nói.

```powershell
# 1. Di chuyển vào thư mục whisper
cd whisper

# 2. Tạo môi trường ảo (Virtual Environment)
python -m venv .venv

# 3. Kích hoạt môi trường ảo
# Windows:
.\.venv\Scripts\activate

# 4. Cài đặt thư viện cần thiết
pip install -r requirements.txt

# 5. (Tùy chọn) Tải trước model để test
# Lệnh này sẽ tải model về máy (khoảng 2-3GB)
python vinai.py "test_audio.mp3"
```

**Lưu ý:**
- File `vinai.py` đã được cấu hình dùng model `suzii/vi-whisper-large-v3-turbo-v1-ct2`.
- Backend sẽ tự động gọi python từ `whisper/.venv/Scripts/python.exe`.

---

## 4. Cài đặt & Chạy Backend

Mở một terminal **mới**:

```powershell
# 1. Di chuyển vào thư mục backend
cd backend

# 2. Cài đặt thư viện Node.js
npm install

# 3. Tạo file .env (nếu chưa có)
# Tạo file .env trong thư mục backend với nội dung sau:
# Lưu ý: Nếu chạy Docker, user mặc định là 'sa' và password như trong docker-compose.yml
DATABASE_URL="sqlserver://localhost:1433;database=tbu_schedule_db;user=sa;password=yourStrong(!)Password;trustServerCertificate=true"
JWT_SECRET="your-super-secret-jwt-token-at-least-32-chars"
JWT_REFRESH_SECRET="your-super-secret-jwt-refresh-token-at-least-32-chars"
PORT=3000
CORS_ORIGIN=http://localhost:5173
# (Không cần cấu hình GROQ API Key nữa vì đã dùng Whisper local)

# 4. Đồng bộ Database Schema
npx prisma generate
npx prisma db push

# 5. Chạy Backend Server
npm run dev
```

*Backend sẽ chạy tại: `http://localhost:3000`*

---

## 5. Cài đặt & Chạy Frontend

Mở một terminal **mới** khác (tại thư mục gốc của dự án):

```powershell
# 1. Cài đặt thư viện
npm install

# 2. Chạy Frontend
npm run dev
```

*Frontend sẽ chạy tại: `http://localhost:8080` (hoặc port hiển thị trên màn hình)*

---

## ✅ Kiểm thử tính năng AI Voice

1. Mở web Frontend.
2. Vào phần tạo **Biên bản cuộc họp** (Meeting Record).
3. Upload file ghi âm hoặc ghi âm trực tiếp.
4. Bấm nút **"Chuyển văn bản"** (Transcribe).
5. Hệ thống sẽ tự động gọi script Python và hiển thị văn bản tiếng Việt chính xác.
