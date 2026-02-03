# Hướng dẫn thêm Model LLM mới (TBU RAG Chatbot)

Tài liệu này hướng dẫn cách thêm một cổng (provider) LLM mới vào hệ thống RAG Chatbot của Trường Đại học Thái Bình.

## Cấu trúc hệ thống LLM
Hệ thống sử dụng mô hình logic tập trung tại `python_service/rag/llm_generator.py`. Lớp `LLMGenerator` đóng vai trò điều phối (orchestrator), tự động chuyển đổi giữa các provider dựa trên cấu hình.

## Các bước thêm Model mới

### 1. Cập nhật cấu hình (`python_service/rag_config.py`)
Thêm các biến môi trường cần thiết cho model mới.
Ví dụ thêm Gemini:
```python
# LLM - Gemini (Cloud)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
```

### 2. Định nghĩa Provider mới (`python_service/rag/llm_generator.py`)
Tạo một class mới kế thừa giao diện chuẩn (có các hàm `generate`, `check_health`, `close`).

```python
class GeminiProvider:
    def __init__(self):
        # Khởi tạo client
        pass
    
    async def check_health(self) -> bool:
        # Kiểm tra kết nối/API Key
        return True
        
    async def generate(self, query, context_docs, chat_history, ...) -> str:
        # Logic gọi API của model mới
        return answer
```

### 3. Đăng ký Provider (`LLMGenerator.__init__`)
Thêm instance của provider mới vào dictionary `self.providers`.

```python
self.providers = {
    "ollama": OllamaProvider(),
    "gemini": GeminiProvider(),
    "new_model": NewModelProvider() # Đăng ký tại đây
}
```

### 4. Cập nhật Giao diện Admin
Thêm option cho model mới trong trang cấu hình LLM để Admin có thể chọn.

---
## Danh sách Model hiện hỗ trợ
1. **Ollama (Local)**: Chạy qwen2.5:7b cục bộ.
2. **Gemini (Cloud)**: Sử dụng Google Generative AI API (gemini-2.5-flash).

## Bảo mật
- LUÔN lưu API Key trong file `.env` (thư mục `backend/.env`).
- KHÔNG commit API Key lên git.
- Python service sẽ tự động nạp từ `.env` thông qua `rag_config.py`.
