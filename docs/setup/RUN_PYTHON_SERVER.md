# Hướng dẫn chạy Server Whisper

## Bước 1: Cài đặt dependencies Python

```bash
cd python_service
pip install -r requirements.txt
```

**Các packages chính:**
- fastapi
- uvicorn
- openai-whisper
- torch
- python-multipart
- pydub

## Bước 2: Chạy Server

```bash
cd python_service
python main.py
```

Server sẽ:
- Tự động tải model Whisper khi chạy lần đầu (1-3GB)
- Load model vào GPU (RTX 3050) hoặc CPU
- Lắng nghe trên port 8081

## Bước 3: Kiểm tra Health

```bash
curl http://localhost:8081/
```

**Kết quả:**
```json
{
  "status": "ok",
  "service": "whisper-stt",
  "model": "large-v3"
}
```

## Bước 4: Test API

```bash
curl -X POST -F "file=@test.mp3" http://localhost:8081/transcribe
```

## Bước 5: Cấu hình Frontend

Thêm vào file `.env` ở thư mục gốc:
```env
VITE_PYTHON_API_URL=http://localhost:8081
```

## Chạy toàn bộ hệ thống

```bash
# Terminal 1: Backend Node.js (port 3001)
cd backend
npm run dev

# Terminal 2: Frontend React (port 8080)
npm run dev

# Terminal 3: Python Service (port 8081)
cd python_service
python main.py
```

## Test Frontend

Mở trình duyệt:
- Frontend: http://localhost:8080
- Hoặc mở file `example_frontend.html`

## Troubleshooting

### Model không tải được
```bash
# Kiểm tra disk space
df -h

# Kiểm tra kết nối internet
ping google.com
```

### CUDA out of memory
- Model sẽ tự động fallback sang CPU
- Không cần cấu hình thủ công

### Port 8081 đang được sử dụng
```bash
# Tìm process đang dùng port 8081
netstat -ano | findstr :8081

# Kill process
taskkill /PID <PID> /F
```

### Frontend không kết nối được
- Kiểm tra Python service đang chạy: `python main.py`
- Kiểm tra `VITE_PYTHON_API_URL` trong `.env`
- Kiểm tra firewall không block port 8081
