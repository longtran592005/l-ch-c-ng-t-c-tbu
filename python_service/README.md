# TBU Speech-to-Text Service

Chuyển đổi giọng nói thành văn bản sử dụng mô hình **vinai/PhoWhisper-small** - Tối ưu cho tiếng Việt trong môi trường cuộc họp.

## 🎯 Tính năng

- 🇻🇳 **Nhận diện tiếng Việt chuẩn**: Tối ưu cho tiếng Việt, chấp nhận giọng vùng miền
- 🔊 **Nhiễu nhẹ**: Hoạt động tốt trong môi trường có nhiễu
- 📝 **Tự động ngắt dòng**: Phân lượt phát biểu tự động
- 🔤 **Giữ nguyên thuật ngữ**: Thuật ngữ chuyên môn, tên riêng, viết tắt được bảo tồn
- ✍ **Định dạng câu**: Dấu câu đầy đủ, câu văn rõ ràng, dễ đọc
- 🚫 **Không thêm nội dung**: Chuyển đổi chính xác, không tự ý thêm nội dung
- ⚡ **Tự chủ hoàn toàn**: Không phụ thuộc dịch vụ bên ngoài

## 📋 Yêu cầu hệ thống

### Minimum Requirements
- **CPU**: 2 cores trở lên
- **RAM**: 4GB trở lên (8GB khuyến nghị)
- **Disk**: 5GB không gian trống
- **Python**: 3.10 trở lên

### Recommended Requirements (GPU)
- **GPU**: NVIDIA GPU với CUDA support (để tăng tốc độ)
- **VRAM**: 4GB trở lên
- **RAM**: 8GB trở lên

## 📦 Cài đặt

### 1. Clone Repository

```bash
cd path/to/tbu-schedule-system
cd python_service
```

### 2. Tạo Virtual Environment (Recommended)

```bash
# Windows
python -m venv venv

# Linux/Mac
python3 -m venv venv
```

### 3. Activate Virtual Environment

```bash
# Windows (PowerShell)
.\venv\Scripts\activate

# Windows (CMD)
.\venv\Scripts\activate.bat

# Linux/Mac
source venv/bin/activate
```

### 4. Install Dependencies

```bash
pip install -r requirements.txt
```

### 5. Cấu hình Environment Variables

```bash
# Copy example file
cp .env.example .env

# Edit .env với cấu hình của bạn
# Windows: notepad .env
# Linux/Mac: nano .env
```

### 6. Khởi động Service

```bash
# Development server
python main.py

# Hoặc với uvicorn
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

## 🔧 Cấu hình

### Environment Variables

| Variable | Mặc định | Mô tả |
|----------|-----------|---------|
| `PORT` | 8001 | Port của service |
| `HOST` | 0.0.0.0 | Host để bind |
| `WHISPER_MODEL` | vinai/PhoWhisper-small | Tên model Whisper |
| `WHISPER_SIZE` | small | Kích thước model (tiny, base, small, medium, large) |
| `DEVICE` | cpu | Device để chạy (cpu, cuda, mps) |
| `COMPUTE_TYPE` | int8 | Loại compute (float16 cho GPU, int8 cho CPU) |
| `DEFAULT_LANGUAGE` | vi | Ngôn ngữ mặc định |
| `DEFAULT_TASK` | transcribe | Task mặc định (transcribe, translate) |
| `DEFAULT_FORMAT_OUTPUT` | true | Tự động định dạng output |
| `AUTO_LINE_BREAKS` | true | Tự động ngắt dòng |
| `MAX_FILE_SIZE` | 524288000 | Kích thước file tối đa (500MB) |
| `TRANSCRIPTION_TIMEOUT` | 600 | Timeout transcription (giây) |

## 🚀 Usage

### Khởi động Service

```bash
# Development
python main.py

# Production
uvicorn main:app --host 0.0.0.0 --port 8001
```

### API Endpoints

#### 1. Health Check

```bash
curl http://localhost:8001/
```

**Response:**
```json
{
  "status": "ready",
  "service": "tbu-speech-to-text",
  "version": "2.0.0",
  "model": "vinai/PhoWhisper-small",
  "device": "cpu",
  "language": "vi"
}
```

#### 2. Model Status

```bash
curl http://localhost:8001/model-status
```

**Response:**
```json
{
  "model_loaded": true,
  "model_name": "vinai/PhoWhisper-small",
  "device": "cpu",
  "compute_type": "int8",
  "language": "vi"
}
```

#### 3. Transcribe Audio

```bash
curl -X POST http://localhost:8001/transcribe \
  -F "file=@/path/to/audio.mp3" \
  -F "language=vi" \
  -F "task=transcribe" \
  -F "format_output=true"
```

**Response:**
```json
{
  "text": "Đây là văn bản đã được chuyển đổi từ audio...",
  "language": "vi",
  "duration": 15.5,
  "confidence": 0.95,
  "raw_text": "..."
}
```

#### 4. Batch Transcribe

```bash
curl -X POST http://localhost:8001/transcribe-batch \
  -F "files=@audio1.mp3" \
  -F "files=@audio2.wav" \
  -F "language=vi"
```

## 📊 Performance

### Thời gian xử lý (CPU)

| Kích thước file | Thời gian |
|---------------|-----------|
| 1 phút | ~30-60 giây |
| 5 phút | ~2-4 phút |
| 10 phút | ~4-8 phút |

### Thời gian xử lý (GPU)

| Kích thước file | Thời gian |
|---------------|-----------|
| 1 phút | ~5-10 giây |
| 5 phút | ~30-60 giây |
| 10 phút | ~1-2 phút |

## 🐛 Troubleshooting

### Model không tải được

**Lỗi:** `OSError: Can't find model`

**Giải pháp:**
```bash
# Tải model thủ công
python -c "import whisper; whisper.load_model('small', download_root='./models')"
```

### CUDA không hoạt động

**Lỗi:** `RuntimeError: CUDA out of memory` / `CUDA not available`

**Giải pháp:**
- Kiểm tra GPU và CUDA đã cài đặt
- Chuyển sang CPU: `DEVICE=cpu`
- Giảm batch size hoặc model size

### Memory Error

**Lỗi:** `MemoryError` hoặc `Killed`

**Giải pháp:**
- Tăng RAM hoặc swap
- Sử dụng model nhỏ hơn
- Sử dụng CPU thay vì GPU

### File quá lớn

**Lỗi:** `HTTP 413 Payload Too Large`

**Giải pháp:**
- Nén file audio
- Chia nhỏ file
- Tăng `MAX_FILE_SIZE`

## 📝 Logging

Logs được lưu tại: `logs/speech_to_text.log`

Xem logs:
```bash
# Tail logs (real-time)
tail -f logs/speech_to_text.log

# View all logs
cat logs/speech_to_text.log
```

## 🐳 Docker

### Build Image

```bash
docker build -t tbu-speech-to-text .
```

### Run Container

```bash
docker run -p 8001:8001 \
  -v $(pwd)/models:/app/models \
  -v $(pwd)/logs:/app/logs \
  tbu-speech-to-text
```

### Docker Compose

```bash
# Từ root của project
docker-compose up python-ai
```

## 🚀 Deployment

### Production Server

```bash
# Sử dụng gunicorn hoặc uvicorn với workers
uvicorn main:app --host 0.0.0.0 --port 8001 --workers 4

# Hoặc với gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8001
```

### PM2 Process Manager

```bash
# Install PM2
npm install -g pm2

# Start service
pm2 start "python main.py" --name "tbu-speech-to-text"

# View logs
pm2 logs tbu-speech-to-text

# Restart
pm2 restart tbu-speech-to-text

# Stop
pm2 stop tbu-speech-to-text
```

## 📚 Tài liệu tham khảo

- [Whisper Documentation](https://github.com/openai/whisper)
- [PhoWhisper GitHub](https://github.com/vinai/pho-whisper)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [PyTorch Documentation](https://pytorch.org/docs/)

## 📄 License

MIT License - Xem LICENSE file để biết chi tiết.

## 🆘 Support

Nếu gặp vấn đề:

1. Kiểm tra logs tại `logs/speech_to_text.log`
2. Xem documentation tại `../docs/SPEECH_TO_TEXT_SETUP.md`
3. Kiểm tra health check: `curl http://localhost:8001/`

## 🔄 Changelog

### Version 2.0.0
- ✅ Tích hợp PhoWhisper model
- ✅ Tối ưu cho tiếng Việt
- ✅ Tự động ngắt dòng
- ✅ Batch processing support
- ✅ Health checks
- ✅ Docker support
- ✅ Better error handling

### Version 1.0.0
- Mock implementation (daotao.abaii.vn)
