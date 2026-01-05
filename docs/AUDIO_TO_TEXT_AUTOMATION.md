# Automation Tool: Chuyển đổi Audio sang Văn bản

## Tổng quan

Tool này sử dụng **Puppeteer** để tự động hóa việc upload file audio lên trang web [daotao.abaii.vn/#/tockyat-fileat](https://daotao.abaii.vn/#/tockyat-fileat) và lấy kết quả văn bản về, mô phỏng hành động của người dùng.

## Cách hoạt động

1. **Mở trình duyệt** (headless mode)
2. **Truy cập trang web** daotao.abaii.vn/#/tockyat-fileat
3. **Tìm input file upload** hoặc button upload
4. **Upload file audio**
5. **Chờ xử lý** (tối đa 5 phút)
6. **Lấy kết quả văn bản** từ trang web
7. **Trả về kết quả** cho frontend

## Cài đặt

### 1. Cài đặt Dependencies

```bash
cd backend
npm install
```

Puppeteer sẽ tự động cài đặt Chromium khi bạn chạy `npm install`.

### 2. Cấu hình (Optional)

Thêm vào `.env` nếu cần thay đổi URL:

```env
ABAII_URL=https://daotao.abaii.vn/#/tockyat-fileat
```

## Sử dụng

### API Endpoint

```
POST /api/audio-to-text/convert
Content-Type: multipart/form-data

Body:
- audioFile: File (audio file)
- language: string (optional, default: 'vi')
```

### Response

```json
{
  "success": true,
  "text": "Văn bản đã chuyển đổi...",
  "processingTime": 45
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message"
}
```

## Cấu trúc Code

### Service: `backend/src/services/audioToTextAutomation.service.ts`

- `getBrowser()`: Tạo hoặc lấy browser instance (singleton)
- `convertAudioToTextAutomation()`: Hàm chính để automation
- `findElement()`: Tìm element với nhiều selector
- `waitForElement()`: Chờ element xuất hiện

### Controller: `backend/src/controllers/audioToText.controller.ts`

- Xử lý request từ frontend
- Lưu file tạm nếu cần
- Gọi automation service
- Trả về kết quả

## Selectors được sử dụng

Tool tự động tìm các element với nhiều selector khả dĩ:

### File Input
- `input[type="file"]`
- `input[accept*="audio"]`
- `input[accept*=".mp3"]`
- `input[accept*=".wav"]`
- `.file-upload input`
- `#file-upload`

### Upload Button
- Button có text chứa "Upload", "Tải lên", "Chọn file", "Browse"

### Result Text
- `.result-text`
- `.transcript`
- `.output-text`
- `[data-testid="result"]`
- `textarea[readonly]`
- `.text-result`
- `#result`
- `.converted-text`

## Xử lý lỗi

### Timeout
- Timeout mặc định: 5 phút (300 giây)
- Có thể điều chỉnh trong code: `MAX_WAIT_TIME`

### Element không tìm thấy
- Tool sẽ thử nhiều selector khác nhau
- Nếu không tìm thấy, sẽ throw error với message rõ ràng

### Trang web thay đổi cấu trúc
- Nếu trang web thay đổi cấu trúc, cần cập nhật selectors trong code
- Có thể debug bằng cách set `headless: false` để xem browser

## Debugging

### Chạy ở chế độ có UI

Sửa trong `audioToTextAutomation.service.ts`:

```typescript
const browser = await puppeteer.launch({
  headless: false, // Hiển thị browser
  // ...
});
```

### Logging

Tool có logging chi tiết:
- `[AudioToText] Navigating to...`
- `[AudioToText] Looking for file input...`
- `[AudioToText] File uploaded, waiting for processing...`
- `[AudioToText] Waiting for result...`
- `[AudioToText] Successfully extracted text...`

### Screenshot (Optional)

Có thể thêm screenshot để debug:

```typescript
await page.screenshot({ path: 'debug.png' });
```

## Performance

- **Browser instance**: Được tái sử dụng (singleton) để tăng performance
- **Timeout**: 5 phút cho việc xử lý audio
- **Polling interval**: Kiểm tra kết quả mỗi 2 giây

## Lưu ý

1. **Puppeteer cần Chromium**: Tự động cài khi install package
2. **Memory**: Puppeteer sử dụng khá nhiều RAM
3. **Concurrent requests**: Nên giới hạn số request đồng thời
4. **Error handling**: Luôn có fallback và error message rõ ràng
5. **Cleanup**: Browser sẽ được đóng khi server shutdown

## Troubleshooting

### Lỗi: "Cannot find module 'puppeteer'"

```bash
cd backend
npm install puppeteer
```

### Lỗi: "Failed to launch browser"

- Kiểm tra đã cài đủ dependencies cho Chromium
- Trên Linux, có thể cần: `apt-get install -y chromium-browser`

### Lỗi: "Element not found"

- Trang web có thể đã thay đổi cấu trúc
- Cần cập nhật selectors trong code
- Có thể debug bằng cách set `headless: false`

### Timeout quá lâu

- File audio quá lớn hoặc phức tạp
- Có thể tăng `MAX_WAIT_TIME` nếu cần
- Hoặc kiểm tra xem trang web có đang hoạt động không

## Tương lai

- [ ] Thêm retry mechanism
- [ ] Thêm queue để xử lý nhiều request
- [ ] Cache kết quả để tránh chuyển đổi lại
- [ ] Thêm progress tracking
- [ ] Support nhiều trang web khác

