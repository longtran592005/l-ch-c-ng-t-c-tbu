# Kế hoạch Nâng cấp Hệ thống Ghi Âm & Tạo Biên Bản Cuộc Họp Tự Động (TBU)

## 1. Tổng quan & Mục tiêu
Xây dựng quy trình khép kín giúp Ban Giám hiệu / Thư ký cuộc họp:
1.  **Ghi âm trực tiếp** hoặc **Tải lên file ghi âm** (hỗ trợ file lớn > 2 giờ).
2.  **Chuyển đổi âm thanh thành văn bản (Speech-to-Text)** tự động.
3.  **Tạo biên bản cuộc họp (Summarization)** chuẩn thể thức hành chính từ nội dung văn bản.

## 2. Kiến trúc Giải pháp

### A. Xử lý File Âm thanh (Audio Processing)
*   **Vấn đề**: File ghi âm 2 tiếng rất nặng (100MB - 1GB) và dài.
*   **Giải pháp**:
    *   **Frontend**: Sử dụng cơ chế **Chunk Upload** (chia nhỏ file khi tải lên) để tránh lỗi đường truyền.
    *   **Backend**: Lưu trữ file vào thư mục `uploads/meetings/`. Sử dụng `ffmpeg` để nén file (convert sang MP3 64kbps) trước khi xử lý để giảm tải.

### B. Chuyển đổi Giọng nói sang Văn bản (Transcribe)
*   **Công nghệ đề xuất**: **OpenAI Whisper** (Mô hình nhận dạng giọng nói tốt nhất hiện nay cho tiếng Việt).
*   **Phương án triển khai**:
    *   *Phương án 1 (Cloud API)*: Gọi API OpenAI (Nhanh, chính xác, tốn phí).
    *   *Phương án 2 (Local Server)*: Chạy Python script với thư viện `faster-whisper`. (Miễn phí, cần máy chủ RAM > 8GB).
*   **Quy trình xử lý**:
    1.  Chia file âm thanh dài 2 giờ thành các đoạn 10-15 phút.
    2.  Xử lý song song hoặc tuần tự từng đoạn.
    3.  Ghép nối văn bản lại thành bản thô (Transcript).

### C. Tạo Biên Bản Cuộc Họp (Minutes Generation)
*   **Công nghệ**: Sử dụng LLM (Gemini Pro hoặc GPT-4).
*   **Quy trình**:
    1.  Đưa văn bản thô (Transcript) vào LLM.
    2.  Sử dụng **Prompt Engineering** chuyên biệt cho thể thức đại học.

## 3. Quy trình Triển khai Chi tiết

### Bước 1: Nâng cấp Giao diện (Frontend)
*   [ ] **Trình ghi âm (Audio Recorder)**:
    *   Thêm visualizer (sóng âm) để biết đang thu.
    *   Tự động lưu tạm vào IndexedDB của trình duyệt để tránh mất dữ liệu nếu lỡ tải lại trang.
*   [ ] **Trình quản lý file**:
    *   Hiển thị thanh tiến trình (Progress bar) thật khi tải file lớn.
    *   Hỗ trợ định dạng: `.mp3`, `.wav`, `.m4a`, `.webm`.
*   [ ] **Trình chỉnh sửa biên bản (Editor)**:
    *   Chia làm 2 cột: Bên trái là Văn bản thô (có thể nghe lại đoạn audio tương ứng khi click), Bên phải là Biên bản hoàn chỉnh.

### Bước 2: Xây dựng Backend AI (Python Service)
Vì Node.js không mạnh về xử lý AI, ta sẽ dựng một **Microservice nhỏ bằng Python**.

**Công nghệ**: Python, FastAPI, OpenAI Whisper, FFmpeg.

**Luồng dữ liệu**:
1.  Node.js nhận file upload -> Lưu xuống đĩa.
2.  Node.js gọi API sang Python Service (hoặc hàng đợi Redis).
3.  Python xử lý:
    *   `Transcript = Whisper.transcribe(audio_file)`
    *   `Minutes = LLM.summarize(Transcript, Template_TBU)`
4.  Python trả kết quả về Node.js.
5.  Node.js lưu vào Database và thông báo cho Frontend (qua Socket hoặc Polling).

### Bước 3: Định dạng Biên Bản (Template TBU)
Thiết lập Prompt cho AI để đầu ra tuân thủ mẫu:

```text
BỘ CÔNG THƯƠNG
TRƯỜNG ĐẠI HỌC THÁI BÌNH
-------

BIÊN BẢN CUỘC HỌP
Về việc: [Tiêu đề cuộc họp]

1. Thời gian: [Giờ, Ngày]
2. Địa điểm: [Địa điểm]
3. Thành phần tham dự:
   - Chủ trì: [Tên]
   - Thư ký: [Tên]
   - Thành viên: [Danh sách]
4. Nội dung cuộc họp:
   - Ý kiến ông/bà A: ...
   - Ý kiến ông/bà B: ...
5. Kết luận của chủ tọa:
   ...
```

## 4. Lộ trình Thực hiện (Roadmap)
1.  **Tuần 1**: Sửa lỗi UI upload file & Playback file âm thanh (đang bị lỗi).
2.  **Tuần 2**: Tích hợp thuật toán Speech-to-Text (Whisper) để ra văn bản thô.
3.  **Tuần 3**: Tích hợp thuật toán Tóm tắt (LLM) để ra biên bản.
4.  **Tuần 4**: Tinh chỉnh giao diện so sánh Audio - Text và xuất file Word/PDF.

## 5. Lưu ý cho Hoàn cảnh TBU
*   **Bảo mật**: Nếu cuộc họp có nội dung nhạy cảm, nên ưu tiên chạy mô hình **Local (Offline)** thay vì gửi lên Cloud.
*   **Độ chính xác**: Với các thuật ngữ chuyên ngành giáo dục/đào tạo, cần cho AI học thêm hoặc bổ sung từ điển (Custom Vocabulary).
