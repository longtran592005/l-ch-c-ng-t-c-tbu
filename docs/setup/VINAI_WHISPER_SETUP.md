# Whisper Speech-to-Text Integration

## Tổng quan
Hệ thống tích hợp model OpenAI Whisper (large-v3) để chuyển đổi giọng nói tiếng Việt thành văn bản offline.

## Cấu trúc

### Backend Python (FastAPI)
- **File chính**: `python_service/main.py`
- **Service**: `python_service/vinai.py`
- **Port**: 8081

### Frontend (React)
- **Service**: `src/services/audioToText.service.ts`
- **Component**: `src/components/meeting/AudioToTextConverter.tsx`

## Cài đặt Backend Python

### 1. Cài đặt dependencies
```bash
cd python_service
pip install -r requirements.txt
```

### 2. Tải model Whisper (tự động tải khi chạy lần đầu)
Model sẽ tự động tải về khi lần đầu tiên bạn chạy server. Kích thước model khoảng 1-2GB.

### 3. Cấu hình .env (Frontend)
Thêm vào file `.env` ở thư mục gốc:
```env
VITE_PYTHON_API_URL=http://localhost:8081
```

## Chạy Server

### Cách 1: Chạy Python service độc lập
```bash
cd python_service
python main.py
```

Server sẽ chạy trên http://localhost:8081

### Cách 2: Chạy toàn bộ hệ thống
```bash
# Terminal 1: Backend Node.js
cd backend
npm run dev

# Terminal 2: Frontend React
npm run dev

# Terminal 3: Python Service (port 8081)
cd python_service
python main.py
```

## Cấu hình Model

### Thông số mặc định (tối ưu cho RTX 3050 6GB)
- **Model**: large-v3
- **beam_size**: 5
- **Device**: CUDA (GPU) / CPU (fallback)
- **Language**: Vietnamese (vi)

### Fallback tự động
- Nếu CUDA lỗi → Tự động chuyển sang CPU
- Không cần cấu hình thủ công

## API Endpoint

### POST /transcribe
**Input**: multipart/form-data
```
file: Audio file (mp3, wav, m4a)
```

**Output**: JSON
```json
{
  "text": "Văn bản chuyển đổi từ giọng nói..."
}
```

## Sử dụng trong Frontend

### Ví dụ React Component
```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { convertAudioToText } from '@/services/audioToText.service';

const AudioTranscriber = () => {
  const [isConverting, setIsConverting] = useState(false);

  const handleTranscribe = async (audioFile: File) => {
    setIsConverting(true);
    try {
      const result = await convertAudioToText({ audioFile, language: 'vi' });
      if (result.success) {
        console.log('Kết quả:', result.text);
        // Đổ text vào trường "NỘI DUNG CUỘC HỌP"
      } else {
        console.error('Lỗi:', result.error);
      }
    } catch (error) {
      console.error('Lỗi chuyển đổi:', error);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <Button onClick={() => document.getElementById('audioInput').click()}>
      {isConverting ? 'Đang xử lý...' : 'Chuyển văn bản'}
      <input
        id="audioInput"
        type="file"
        accept="audio/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleTranscribe(file);
        }}
      />
    </Button>
  );
};
```

## Troubleshooting

### Model không tải được
- Kiểm tra kết nối internet
- Kiểm tra disk space (cần khoảng 3GB)
- Model sẽ tự động tải về thư mục cache của faster-whisper

### CUDA out of memory
- Giảm `batch_size` trong `vinai.py`
- Model sẽ tự động fallback sang CPU nếu CUDA lỗi

### Frontend không kết nối được
- Kiểm tra Python service đang chạy: `python main.py`
- Kiểm tra port 8081 không bị block
- Kiểm tra `VITE_PYTHON_API_URL` trong `.env`

### Kết quả không chính xác
- Whisper VinAI đã được tối ưu cho tiếng Việt
- Kết quả có thể tùy thuộc vào chất lượng âm thanh
- Có thể chỉnh sửa thủ công kết quả trong giao diện

## File Audio hỗ trợ
- MP3
- WAV
- M4A
- AAC
- FLAC
- OGG

## Yêu cầu hệ thống

### Tối thiểu
- Python 3.8+
- PyTorch 2.0+
- 4GB RAM
- 2GB disk space

### Khuyến nghị (sử dụng GPU)
- NVIDIA GPU với CUDA 11.8+
- 6GB VRAM (RTX 3050 hoặc tương đương)
- 8GB RAM
- 4GB disk space
