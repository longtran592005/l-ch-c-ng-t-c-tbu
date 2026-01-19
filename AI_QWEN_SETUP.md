# Hướng Dẫn Tích Hợp Qwen 2.5 7B Local (Tối Ưu Cho RTX 3050 6GB)

Tài liệu này hướng dẫn cách thiết lập model AI Qwen 2.5 7B chạy trực tiếp trên máy của bạn để thực hiện nhiệm vụ sửa lỗi chính tả và chuẩn hóa văn bản tiếng Việt.

## 1. Phân Tích Cấu Hình & Giải Pháp
- **Cấu hình của bạn**:
  - GPU: RTX 3050 (6GB VRAM) - Khá hạn chế cho các model ngôn ngữ lớn (LLM).
  - RAM: 24GB - Rất tốt, có thể gánh phần model nếu VRAM bị tràn.
- **Vấn đề**: Model Qwen 2.5 7B bản gốc (FP16) cần khoảng 14-16GB VRAM -> Không chạy được trực tiếp trên GPU của bạn.
- **Giải pháp**:
  - Sử dụng **Ollama**: Nền tảng chạy AI local nhẹ và tốt nhất hiện nay trên Windows.
  - Sử dụng **Quantization 4-bit (q4_k_m)**: Nén model xuống còn khoảng 4.7GB.
  - **Kết quả**: Model sẽ chạy hoàn toàn (hoặc phần lớn) trên GPU 6GB của bạn, cho tốc độ phản hồi cực nhanh (nhanh hơn CPU gấp nhiều lần).

## 2. Cài Đặt Ollama (Chỉ làm 1 lần)
1.  Truy cập trang chủ: [https://ollama.com/download](https://ollama.com/download)
2.  Tải bộ cài cho **Windows**.
3.  Chạy file cài đặt `OllamaSetup.exe`.
4.  Sau khi cài xong, mở **Command Prompt (CMD)** hoặc **PowerShell** và gõ lệnh sau để kiểm tra:
    ```bash
    ollama --version
    ```

## 3. Tải Model Qwen 2.5 7B
Tại cửa sổ CMD/PowerShell, chạy lệnh sau để tải model về máy:

```bash
ollama run qwen2.5:7b-instruct-q4_0
```
*(Nếu hệ thống hỏi, bạn cứ để nó tải, dung lượng khoảng 4.5GB)*

Sau khi tải xong và thấy dấu nhắc `>>>`, bạn có thể gõ thử "Xin chào" để test. Gõ `/bye` để thoát.

## 4. Tích Hợp Vào Dự Án
Hệ thống Backend đã được tôi lập trình sẵn một Service mới tên là `llm.service.ts` để kết nối với Ollama.

- **URL kết nối**: `http://localhost:11434/api/generate` (Mặc định của Ollama)
- **Model sử dụng**: `qwen2.5:7b-instruct-q4_0`
- **Nhiệm vụ**: Nhận văn bản thô từ Whisper -> Gửi sang Ollama kèm câu lệnh (Prompt) yêu cầu sửa chính tả -> Trả về văn bản sạch.

## 5. Lưu Ý Khi Sử Dụng
- Khi bạn bấm chức năng "Chuẩn hóa văn bản (AI)", Ollama sẽ chạy ngầm.
- Vì model nén chiếm khoảng 4.5GB - 5GB VRAM:
  - Nếu bạn đang chạy game nặng hoặc phần mềm đồ họa, có thể sẽ bị chậm do VRAM đầy.
  - Khi không dùng, Ollama sẽ tự giải phóng VRAM sau vài phút.
