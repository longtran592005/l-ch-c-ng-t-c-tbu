# Hướng dẫn tích hợp AI (Whisper + Qwen 2.5) cho TBU Schedule Management

## Tổng quan

Hệ thống đã được nâng cấp với tích hợp AI hoàn chỉnh:
- **Whisper**: Chuyển đổi giọng nói sang văn bản (STT)
- **Qwen 2.5**: Tóm tắt, biên bản, phân tích cuộc họp, trích xuất action items
- **Real-time Transcription**: Ghi âm và chuyển đổi văn bản thời gian thực

## Cấu trúc hệ thống

```
┌─────────────────┐
│  Frontend     │  React + TypeScript + Shadcn/ui
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Backend      │  Node.js + Express + Prisma
└────────┬────────┘
         │
         ▼
┌──────────────────────┐
│  Python AI Service  │  FastAPI + Whisper + Qwen 2.5
└──────────────────────┘
```

## Yêu cầu hệ thống

### Cấu hình tối thiểu

#### GPU (cho hiệu suất tốt nhất)
- **GPU**: NVIDIA RTX 3060 hoặc cao hơn
- **VRAM**: Tối thiểu 6GB
- **CUDA**: Version 11.8 hoặc mới hơn
- **RAM**: 16GB hoặc nhiều hơn (để Qwen 7B 4-bit)
- **Đĩa cứng**: 20GB trống (cho models và cache)

#### CPU (không có GPU)
- **CPU**: Quad-core hoặc nhiều hơn
- **RAM**: 32GB (Qwen sẽ chạy rất chậm trên CPU)
- **Lưu ý**: Chỉ nên dùng CPU cho testing, không production

### Hệ điều hành
- Windows 10/11 (WSL2 recommended)
- Ubuntu 20.04/22.04
- macOS 12+ (Apple Silicon hỗ trợ tốt hơn)

## Cài đặt

### 1. Cài đặt Backend (Node.js)

```bash
# Di chuyển đến thư mục backend
cd backend

# Cài đặt dependencies
npm install

# Tạo file .env từ .env.example
cp .env .env

# Cấu hình database trong .env
DATABASE_URL="sqlserver://localhost:1433;database=tbu_schedule;trustServerCertificate=true"

# Cấu hình AI service URL
PYTHON_SERVICE_URL=http://localhost:8001

# Cấu hình JWT secrets
JWT_SECRET=min-32-character-random-string
JWT_REFRESH_SECRET=min-32-character-random-string

# Run migrations
npm run prisma:generate
npm run prisma:migrate

# Start server
npm run dev
```

Backend sẽ chạy tại: `http://localhost:8000`

### 2. Cài đặt Python AI Service

```bash
# Di chuyển đến thư mục python_service
cd python_service

# Tạo virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Cài đặt dependencies
pip install -r requirements.txt

# Cấu hình từ .env.example
cp .env.example .env

# Cấu hình .env theo GPU của bạn
# Với GPU (RTX 3060):
DEVICE=cuda
COMPUTE_TYPE=float16
QWEN_USE_QUANTIZATION=true

# Chỉ CPU (slow!):
DEVICE=cpu
COMPUTE_TYPE=int8

# Start service
python main.py
```

Python service sẽ chạy tại: `http://localhost:8001`

### 3. Cài đặt Frontend

```bash
# Di chuyển đến thư mục gốc
cd /path/to/tbu-schedule-system

# Cài đặt dependencies
npm install

# Tạo file .env từ .env.example
cp .env .env

# Cấu hình API URL
VITE_API_BASE_URL=http://localhost:8000/api

# Cấu hình Python WebSocket URL (cho realtime)
VITE_PYTHON_WS_URL=ws://localhost:8001/realtime-transcribe

# Start frontend
npm run dev
```

Frontend sẽ chạy tại: `http://localhost:8080`

## Tải và Cấu hình Models

### Whisper Model (tự động tải)

Whisper model sẽ được tải tự động khi service khởi động:
- **vinai/PhoWhisper-small**: Model mặc định, ~240MB
- Hoặc: `vinai/PhoWhisper-base`, `vinai/PhoWhisper-tiny`

Models được lưu tại: `python_service/models/`

### Qwen 2.5 Model (cần cấu hình)

Qwen model sẽ được tải từ Hugging Face khi service khởi động:
- **Qwen/Qwen2.5-7B-Instruct**: Model mặc định
- Dung lượng: ~15GB (full), ~5GB (4-bit quantized)

#### Tải thủ công (nếu tải tự động thất bại):

```bash
cd python_service

# Tải model 4-bit quantized (recommended cho RTX 3060)
python -c "from transformers import AutoModelForCausalLM, BitsAndBytesConfig; model = AutoModelForCausalLM.from_pretrained('Qwen/Qwen2.5-7B-Instruct', quantization_config=BitsAndBytesConfig(load_in_4bit=True)); print('Model loaded successfully')"
```

## API Endpoints

### Python AI Service

| Endpoint | Method | Mô tả |
|----------|--------|-----------|
| `/` | GET | Health check |
| `/model-status` | GET | Status models |
| `/transcribe` | POST | Transcribe file audio |
| `/realtime-transcribe` | WebSocket | Real-time STT |
| `/generate-summary` | POST | Tóm tắt |
| `/generate-minutes` | POST | Biên bản |
| `/extract-action-items` | POST | Trích xuất action items |
| `/deep-analysis` | POST | Phân tích sâu |
| `/meeting-insights` | POST | Meeting insights |

### Backend API

| Endpoint | Method | Mô tả |
|----------|--------|-----------|
| `/meeting-records/:id/summary` | POST | Generate summary |
| `/meeting-records/:id/minutes` | POST | Generate minutes |
| `/meeting-records/:id/action-items` | POST | Extract action items |
| `/meeting-records/:id/deep-analysis` | POST | Deep analysis |
| `/meeting-records/:id/insights` | POST | Meeting insights |

## Sử dụng

### 1. Tạo biên bản họp mới

1. Vào trang **Nội dung cuộc họp** (Admin)
2. Click **Tạo biên bản mới**
3. Điền thông tin cuộc họp
4. Click **Lưu**

### 2. Upload file ghi âm

1. Chọn biên bản cuộc họp
2. Vào tab **Ghi âm & Tệp**
3. Click **Tải file lên** (hoặc **Ghi âm trực tiếp**)
4. Chọn file audio (MP3, WAV, M4A)
5. Chờ upload hoàn thành

### 3. Chuyển đổi audio sang văn bản

1. Trong tab **Ghi âm & Tệp**, click **Chuyển văn bản (AI)** trên file audio
2. Chờ AI xử lý (thời gian phụ thuộc độ dài file)
3. Văn bản sẽ tự động thêm vào tab **Nội dung cuộc họp**

### 4. Tạo biên bản AI

**Tự động**:
1. Vào tab **Xử lý biên bản**
2. Click **Biên bản AI** trong dialog hoặc nút trên desktop
3. Qwen sẽ tạo biên bản hoàn chỉnh
4. Click **Lưu biên bản**

**Tùy chỉnh**:
1. Trong tab **Xử lý biên bản**, điền template biên bản
2. Click **Tạo bằng AI**

### 5. AI Analysis (Qwen 2.5)

1. Vào tab **AI Analysis** trong biên bản cuộc họp
2. Sử dụng các công cụ AI:

   **Tóm tắt**:
   - Tạo tóm tắt ngắn gọn 3-5 đoạn
   - Nêu rõ mục tiêu chính
   - Liệt kê quyết định quan trọng

   **Biên bản**:
   - Tạo biên bản có cấu trúc rõ ràng
   - Bao gồm: Thông tin chung, Nội dung, Quyết định, Action items

   **Action Items**:
   - Trích xuất các công việc cần làm
   - Nhận dạng: Công việc, Người phụ trách, Deadline, Độ ưu tiên

   **Phân tích sâu**:
   - Phân tích mục tiêu, phạm vi
   - Đánh giá tham gia và đóng góp
   - Xác định vấn đề và thách thức

   **Meeting Insights**:
   - Tổng hợp thông tin chi tiết
   - Đánh giá hiệu quả cuộc họp
   - Đề xuất cải tiến

### 6. Ghi âm Realtime

1. Chọn biên bản cuộc họp
2. Click **Ghi âm trực tiếp**
3. Trong dialog, chọn tab **Realtime AI**
4. Click **Bắt đầu ghi âm**
5. Nói vào microphone - văn bản sẽ xuất hiện thời gian thực
6. Click **Dừng ghi âm** khi hoàn thành
7. Click **Lưu văn bản** để lưu vào nội dung cuộc họp

## Troubleshooting

### Lỗi kết nối Python Service

**Error**: `ECONNREFUSED` hoặc `Connection refused`

**Giải pháp**:
1. Kiểm tra Python service đang chạy: `cd python_service && python main.py`
2. Kiểm tra port 8001 đang trống: `netstat -an | findstr :8001` (Windows)
3. Kiểm tra cấu hình `PYTHON_SERVICE_URL` trong backend `.env`

### Lỗi tải Model

**Error**: `Failed to load model` hoặc `CUDA out of memory`

**Giải pháp**:
1. Kiểm tra VRAM GPU: `nvidia-smi`
2. Giảm `MAX_FILE_SIZE` hoặc kích thước batch
3. Sử dụng model nhỏ hơn: `WHISPER_MODEL=vinai/PhoWhisper-tiny`
4. Sử dụng 4-bit quantization: `QWEN_USE_QUANTIZATION=true`
5. Tắt Qwen nếu không đủ VRAM: `QWEN_ENABLED=false`

### Lỗi Transcription quá chậm

**Giải pháp**:
1. Sử dụng GPU thay vì CPU
2. Sử dụng model nhỏ hơn (tiny > base > small)
3. Giảm file audio hoặc chia nhỏ hơn
4. Tắt các dịch vụ khác trên máy

### Lỗi Realtime Transcription không hoạt động

**Giải pháp**:
1. Kiểm tra browser hỗ trợ: Chrome/Firefox/Edge (không dùng Safari)
2. Kiểm tra kết nối WebSocket: `ws://localhost:8001/realtime-transcribe`
3. Cấp quyền microphone cho browser
4. Kiểm tra `VITE_PYTHON_WS_URL` trong frontend `.env`

## Tối ưu hóa hiệu suất

### GPU RTX 3060 (6GB VRAM)

**Cấu hình tối ưu trong `.env`**:
```env
DEVICE=cuda
COMPUTE_TYPE=float16
QWEN_ENABLED=true
QWEN_USE_QUANTIZATION=true
WHISPER_MODEL=vinai/PhoWhisper-small
```

**Thời gian dự kiến**:
- Transcribe (5 phút audio): ~30-60 giây
- Generate summary: ~10-20 giây
- Generate minutes: ~30-60 giây
- Deep analysis: ~40-80 giây

### GPU RTX 4070/4080 (12GB+ VRAM)

**Cấu hình tối ưu**:
```env
DEVICE=cuda
COMPUTE_TYPE=float16
QWEN_ENABLED=true
QWEN_USE_QUANTIZATION=false
WHISPER_MODEL=vinai/PhoWhisper-medium
```

**Thời gian dự kiến**:
- Transcribe (5 phút audio): ~20-40 giây
- Generate summary: ~5-10 giây
- Generate minutes: ~15-30 giây
- Deep analysis: ~20-40 giây

## Security Notes

1. **Không commit file .env**: Đã thêm vào `.gitignore`
2. **Sử dụng environment variables**: Cho secrets (JWT, API keys)
3. **Bảo mật Python service**: Chỉ cho phép truy cập từ backend (CORS)
4. **Rate limiting**: Backend có rate limiting để DDoS
5. **Authentication**: Tất cả API protected routes yêu cầu JWT token

## Cập nhật Logs

- Python service logs: `python_service/logs/speech_to_text.log`
- Backend logs: Console + file logs (nếu được cấu hình)
- Frontend logs: Browser DevTools Console

## Hỗ trợ

Nếu gặp vấn đề:
1. Kiểm tra logs chi tiết
2. Xem Troubleshooting ở trên
3. Kiểm tra GitHub Issues (nếu có)
4. Liên hệ team hỗ trợ

## Roadmap Updates

### Phase 1: Core AI ✅ (Hoàn thành)
- Whisper STT integration
- Qwen 2.5 model loading
- File transcription endpoints
- AI analysis endpoints

### Phase 2: Frontend ✅ (Hoàn thành)
- Realtime recording component
- AI analysis UI
- API integration

### Phase 3: Enhancement (Tương lai)
- [ ] Speaker diarization (phân biệt người nói)
- [ ] Multi-language support
- [ ] Offline mode (TTS)
- [ ] Batch processing cho nhiều file
- [ ] Export biên bản sang PDF/Word
- [ ] Action item tracking dashboard
- [ ] Meeting analytics dashboard
