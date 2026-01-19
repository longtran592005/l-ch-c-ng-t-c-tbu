# Hướng dẫn Cài đặt và Sử dụng Speech-to-Text Service (PhoWhisper)

## 📋 Tổng quan

Hệ thống Speech-to-Text tự chủ sử dụng mô hình **vinai/PhoWhisper-small** để chuyển đổi giọng nói thành văn bản tiếng Việt. Thay thế cho việc sử dụng dịch vụ bên ngoài (daotao.abaii.vn).

## ✨ Tính năng

- ✅ **Tự chủ hoàn toàn**: Không phụ thuộc dịch vụ bên ngoài
- ✅ **PhoWhisper Model**: Tối ưu cho tiếng Việt
- ✅ **Giọng vùng miền**: Hỗ trợ nhiều giọng vùng miền Việt Nam
- ✅ **Nhiễu nhẹ**: Chức năng tốt trong môi trường có nhiễu nhẹ
- ✅ **Tự động ngắt dòng**: Phân lượt phát biểu tự động
- ✅ **Giữ nguyên thuật ngữ**: Thuật ngữ chuyên môn, tên riêng, viết tắt
- ✅ **Định dạng câu**: Dấu câu đầy đủ, câu văn rõ ràng, dễ đọc
- ✅ **Không thêm nội dung**: Chuyển đổi chính xác, không tự ý thêm nội dung

## 🏗️ Kiến trúc

```
┌─────────────────────────────────────────────┐
│          Frontend (React)           │
│                                     │
│   AudioToTextConverter              │
│   └─> audioToText.service.ts      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│        Backend (Node.js)             │
│                                     │
│   AudioToText Controller            │
│   └─> speechToText.service.ts     │
│       └─> HTTP Request            │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│     Python AI Service (FastAPI)       │
│                                     │
│   /transcribe endpoint               │
│   └─> PhoWhisper Model            │
│       └─> Text Output               │
└─────────────────────────────────────────────┘
```

## 📦 Cài đặt

### 1. Cài đặt Backend Dependencies

Backend cần thêm thư viện `form-data` để upload file:

```bash
cd backend
npm install form-data
```

### 2. Cài đặt Python Service

```bash
cd python_service

# Tạo virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Cấu hình Environment Variables

#### Backend (.env)
```env
# URL của Python AI Service
PYTHON_AI_SERVICE_URL=http://localhost:8001
```

#### Python Service (python_service/.env)
```env
# Server Configuration
PORT=8001
HOST=0.0.0.0

# Model Configuration
WHISPER_MODEL=vinai/PhoWhisper-small
WHISPER_SIZE=small

# Device Configuration
# Sử dụng 'cuda' nếu có GPU NVIDIA, 'cpu' nếu không
DEVICE=cpu
COMPUTE_TYPE=int8

# Transcription Configuration
DEFAULT_LANGUAGE=vi
DEFAULT_TASK=transcribe
DEFAULT_FORMAT_OUTPUT=true
AUTO_LINE_BREAKS=true

# File Configuration
MAX_FILE_SIZE=524288000  # 500MB in bytes

# Timeout Settings
UPLOAD_TIMEOUT=300
TRANSCRIPTION_TIMEOUT=600
```

### 4. Khởi động Services

#### Option 1: Local Development

```bash
# Terminal 1: Start Python AI Service
cd python_service
# Activate virtual environment nếu đã tạo
# Windows: venv\Scripts\activate
# Linux/Mac: source venv/bin/activate

# Start service
python main.py
# Hoặc:
uvicorn main:app --host 0.0.0.0 --port 8001
```

```bash
# Terminal 2: Start Backend
cd backend
npm run dev
```

```bash
# Terminal 3: Start Frontend
npm run dev
```

#### Option 2: Docker (Recommended)

```bash
# Start tất cả services với Docker Compose
docker-compose up

# Hoặc chạy cụ thể từng service
docker-compose up python-ai
docker-compose up backend
```

## 🎯 Sử dụng

### 1. Chuyển đổi Audio sang Text qua Frontend

**Trong AudioToTextConverter component:**

```tsx
const handleConvert = async () => {
  if (!audioFile) {
    setError('Không có file audio để chuyển đổi.');
    return;
  }

  setIsConverting(true);
  
  try {
    const result = await convertAudioToText({
      audioFile,
      language: 'vi', // Tiếng Việt
    });

    if (result.success && result.text) {
      setExtractedText(result.text);
      toast({
        title: 'Thành công',
        description: `Đã chuyển đổi audio sang text thành công.`,
      });
    }
  } catch (err) {
    setError(err.message || 'Có lỗi xảy ra khi chuyển đổi audio.');
  } finally {
    setIsConverting(false);
  }
};
```

### 2. Gọi trực tiếp qua Backend API

**Endpoint:** `POST /api/audio-to-text/convert`

**Request:**
```bash
curl -X POST http://localhost:3000/api/audio-to-text/convert \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "audioFile=@/path/to/audio.mp3" \
  -F "language=vi" \
  -F "task=transcribe" \
  -F "formatOutput=true"
```

**Response:**
```json
{
  "success": true,
  "text": "Đây là văn bản đã được chuyển đổi từ audio...",
  "language": "vi",
  "processingTime": 15.5,
  "confidence": 0.95
}
```

### 3. Health Check

Kiểm tra trạng thái service:

```bash
# Health check
curl http://localhost:8001/

# Model status
curl http://localhost:8001/model-status
```

**Response:**
```json
{
  "status": "ready",
  "model": "vinai/PhoWhisper-small",
  "device": "cpu",
  "compute_type": "int8"
}
```

## 📋 Định dạng File Hỗ trợ

| Định dạng | Phần mở rộng | Ghi chú |
|-----------|----------------|---------|
| MP3 | .mp3 | Khuyến nghị |
| WAV | .wav | Chất lượng cao |
| M4A | .m4a | Apple devices |
| WEBM | .webm | Browsers |
| OGG | .ogg | Open format |
| AAC | .aac | Compressed |
| FLAC | .flac | Lossless |
| MP4 | .mp4 | Container format |

**Kích thước tối đa:** 500MB

## 🔧 Cấu hình Nâng cao

### Sử dụng GPU (CUDA)

Nếu máy có GPU NVIDIA, có thể tăng tốc độ transcription:

```env
# python_service/.env
DEVICE=cuda
COMPUTE_TYPE=float16
```

**Yêu cầu:**
- NVIDIA GPU với CUDA support
- CUDA Toolkit 11.0+
- PyTorch với CUDA support

### Điều chỉnh Model Size

Chọn model size dựa trên nhu cầu:

| Size | Tốc độ | Độ chính xác | Bộ nhớ |
|------|---------|-------------|---------|
| tiny | Rất nhanh | Trung bình | ~70MB |
| base | Nhanh | Tốt | ~140MB |
| **small** | Trung bình | **Rất tốt** | ~460MB |
| medium | Chậm | Xuất sắc | ~1.5GB |
| large | Rất chậm | Xuất sắc nhất | ~2.9GB |

```env
WHISPER_SIZE=small
```

### Batch Processing

Xử lý nhiều file cùng lúc:

```bash
curl -X POST http://localhost:8001/transcribe-batch \
  -F "files=@audio1.mp3" \
  -F "files=@audio2.wav" \
  -F "language=vi"
```

## 🐛 Troubleshooting

### 1. Python Service không khởi động

**Lỗi:** `ModuleNotFoundError: No module named 'whisper'`

**Giải pháp:**
```bash
# Install dependencies
pip install -r requirements.txt

# Hoặc cài thủ công
pip install openai-whisper torch torchaudio
```

### 2. CUDA không hoạt động

**Lỗi:** `RuntimeError: CUDA out of memory`

**Giải pháp:**
- Chuyển sang CPU:
  ```env
  DEVICE=cpu
  COMPUTE_TYPE=int8
  ```
- Hoặc giảm batch size (nếu có config)

### 3. Connection Refused

**Lỗi:** `ECONNREFUSED` khi backend gọi Python service

**Giải pháp:**
- Kiểm tra Python service đã chạy: `curl http://localhost:8001/`
- Kiểm tra port: đảm bảo không có service khác dùng port 8001
- Kiểm tra firewall: đảm bảo port 8001 được mở

### 4. File quá lớn

**Lỗi:** `FILE_TOO_LARGE`

**Giải pháp:**
- Chia file audio thành các phần nhỏ hơn
- Hoặc tăng `MAX_FILE_SIZE` trong config

### 5. Transcription quá chậm

**Lời khuyên:**
- Sử dụng GPU nếu có: `DEVICE=cuda`
- Nén audio file trước khi upload
- Sử dụng model size nhỏ hơn: `WHISPER_SIZE=tiny`

## 📊 Performance

| Tình huống | Tốc độ | Thời gian xử lý |
|-------------|---------|-----------------|
| Audio 1 phút (CPU) | Trung bình | ~30-60 giây |
| Audio 1 phút (GPU) | Nhanh | ~5-10 giây |
| Audio 5 phút (CPU) | Chậm | ~2-5 phút |
| Audio 5 phút (GPU) | Nhanh | ~30-60 giây |

## 🔐 Security

- File upload được validate trước khi xử lý
- Kích thước file được giới hạn (500MB)
- CORS configuration
- Rate limiting (nếu enable)
- Sanitize filename để tránh path traversal

## 📝 Logging

Logs được lưu tại: `python_service/logs/speech_to_text.log`

Xem logs:
```bash
# Tail logs
tail -f python_service/logs/speech_to_text.log

# View all logs
cat python_service/logs/speech_to_text.log
```

## 🚀 Deployment

### Docker Production

```bash
# Build và chạy tất cả services
docker-compose -f docker-compose.yml up -d

# Xem logs
docker-compose logs -f python-ai
```

### Manual Production

```bash
# 1. Cài đặt Python service trên server
cd python_service
pip install -r requirements.txt

# 2. Start với PM2 hoặc supervisor
pm2 start "python main.py" --name "tbu-speech-to-text"

# 3. Cấu hình backend để gọi đúng URL
# backend/.env
PYTHON_AI_SERVICE_URL=http://your-server-ip:8001
```

## 📚 Tài liệu tham khảo

- [Whisper Paper](https://arxiv.org/abs/2212.04356)
- [PhoWhisper GitHub](https://github.com/vinai/pho-whisper)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [PyTorch Documentation](https://pytorch.org/docs/)

## 🆘 Support

Nếu gặp vấn đề:

1. **Kiểm tra logs**: Xem error messages trong logs
2. **Health check**: Đảm bảo Python service đang chạy
3. **Network**: Kiểm tra kết nối giữa backend và Python service
4. **Resources**: Đảm bảo đủ RAM và CPU
5. **Version**: Kiểm tra versions của dependencies

## 📄 License

Mô hình PhoWhisper được release dưới [MIT License](https://github.com/vinai/pho-whisper/blob/main/LICENSE).

## 🔄 Migration từ daotao.abaii.vn

### Những gì đã thay đổi:
- ❌ Không còn phụ thuộc dịch vụ bên ngoài
- ✅ Tự chủ hoàn toàn với local model
- ✅ Không cần API key bên ngoài
- ✅ Không có giới hạn request
- ✅ Dữ liệu không gửi ra ngoài
- ✅ Không phụ thuộc kết nối internet sau khi model được tải

### Cách sử dụng:
Cách sử dụng **GIỐNG YÊU** như trước:
- Upload file audio qua frontend
- Chờ transcription hoàn thành
- Copy kết quả vào editor
- Chỉnh sửa và lưu

Không cần thay đổi code frontend, chỉ cần đảm bảo backend đang chạy.
