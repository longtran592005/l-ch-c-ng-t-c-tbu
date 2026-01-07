# Tích hợp Chuyển đổi Audio sang Văn bản

## Tổng quan

Tài liệu này mô tả phương án tích hợp chuyển đổi file audio cuộc họp thành văn bản sử dụng dịch vụ từ [daotao.abaii.vn](https://daotao.abaii.vn/#/tockyat-fileat).

**Phương án hiện tại**: Sử dụng **Puppeteer** để tự động hóa việc upload file và lấy kết quả từ trang web, mô phỏng hành động của người dùng (vì trang web không có API công khai).

## Workflow

1. **Upload/Ghi âm audio** → File audio được lưu vào hệ thống
2. **Chuyển đổi sang văn bản** → Click nút "Chuyển sang văn bản" trên file audio
3. **Xem và chỉnh sửa văn bản thô** → Văn bản được hiển thị trong dialog để chỉnh sửa
4. **Đưa vào nội dung cuộc họp** → Văn bản được thêm vào tab "Nội dung cuộc họp"
5. **Tạo biên bản** → Từ nội dung đã chỉnh sửa, tạo biên bản cuộc họp

## Cấu trúc Code

### Frontend

#### 1. Service: `src/services/audioToText.service.ts`
- Service để gọi API chuyển đổi audio sang text
- Hỗ trợ 2 phương án:
  - **Phương án 1**: Gọi trực tiếp API của daotao.abaii.vn (nếu có API công khai)
  - **Phương án 2**: Gọi qua backend proxy của dự án
- Fallback về hướng dẫn thủ công nếu API không khả dụng

#### 2. Component: `src/components/meeting/AudioToTextConverter.tsx`
- Dialog component để:
  - Upload file audio
  - Hiển thị tiến trình chuyển đổi
  - Hiển thị và chỉnh sửa văn bản kết quả
  - Copy văn bản hoặc đưa vào nội dung cuộc họp

#### 3. Integration: `src/components/meeting/MeetingRecordDetail.tsx`
- Thêm nút "Chuyển sang văn bản" cho mỗi file audio
- Xử lý khi văn bản được extract
- Tự động chuyển sang tab "Nội dung cuộc họp" sau khi extract

### Backend

#### 1. Service: `backend/src/services/audioToTextAutomation.service.ts`
- Sử dụng Puppeteer để tự động hóa browser
- Mô phỏng hành động người dùng: mở trang, upload file, chờ xử lý, lấy kết quả
- Xử lý timeout và error handling

#### 2. Controller: `backend/src/controllers/audioToText.controller.ts`
- Xử lý request từ frontend
- Gọi automation service để chuyển đổi audio
- Trả về kết quả văn bản

#### 3. Route: `backend/src/routes/audioToText.route.ts`
- Route: `POST /api/audio-to-text/convert`
- Sử dụng multer để xử lý file upload

## Cấu hình

### Environment Variables

#### Frontend (.env)
```env
# API base URL của backend
VITE_API_BASE_URL=http://localhost:8000
```

#### Backend (.env)
```env
# (Optional) URL của trang web chuyển đổi audio
ABAII_URL=https://daotao.abaii.vn/#/tockyat-fileat
```

**Lưu ý**: Không cần API key vì sử dụng automation thay vì API.

## Cách sử dụng

### 1. Chuyển đổi Audio sang Văn bản

1. Vào **Chi tiết cuộc họp** → Tab **"Ghi âm và Tệp tin"**
2. Tìm file audio cần chuyển đổi
3. Click nút **"Chuyển sang văn bản"**
4. Dialog sẽ mở ra:
   - Nếu API hoạt động: Click **"Chuyển đổi"** và chờ kết quả
   - Nếu API không hoạt động: Xem hướng dẫn thủ công hoặc dán văn bản đã copy từ trang web

### 2. Chỉnh sửa Văn bản

1. Sau khi văn bản được extract, bạn có thể:
   - Chỉnh sửa trực tiếp trong dialog
   - Copy văn bản để sử dụng ở nơi khác
   - Click **"Sử dụng văn bản này"** để đưa vào nội dung cuộc họp

### 3. Đưa vào Biên bản

1. Văn bản sẽ được tự động thêm vào tab **"Nội dung cuộc họp"**
2. Chỉnh sửa và format lại nội dung nếu cần
3. Chuyển sang tab **"Biên bản"** để tạo biên bản từ nội dung đã chỉnh sửa

## Chi tiết Automation Tool

Tool sử dụng **Puppeteer** để tự động hóa việc upload file audio lên trang web [daotao.abaii.vn/#/tockyat-fileat](https://daotao.abaii.vn/#/tockyat-fileat).

### Cách hoạt động

1. **Mở trình duyệt** (headless mode)
2. **Truy cập trang web** daotao.abaii.vn/#/tockyat-fileat
3. **Tìm input file upload** hoặc button upload
4. **Upload file audio**
5. **Chờ xử lý** (tối đa 5 phút)
6. **Lấy kết quả văn bản** từ trang web
7. **Trả về kết quả** cho frontend

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

### Debugging

Chạy ở chế độ có UI để debug:
```typescript
// Trong audioToTextAutomation.service.ts
const browser = await puppeteer.launch({
  headless: false, // Hiển thị browser
  // ...
});
```

### Selectors được sử dụng

Tool tự động tìm các element với nhiều selector khả dĩ:

**File Input:**
- `input[type="file"]`
- `input[accept*="audio"]`
- `input[accept*=".mp3"]`
- `.file-upload input`

**Result Text:**
- `.result-text`
- `.transcript`
- `.output-text`
- `textarea[readonly]`

### Performance

- **Browser instance**: Được tái sử dụng (singleton)
- **Timeout**: 5 phút cho việc xử lý audio
- **Polling interval**: Kiểm tra kết quả mỗi 2 giây

## Phương án Thủ công (Fallback)

Nếu API không khả dụng, bạn có thể:

1. Truy cập: https://daotao.abaii.vn/#/tockyat-fileat
2. Upload file audio
3. Copy văn bản kết quả
4. Dán vào dialog "Chuyển đổi Audio sang Văn bản" hoặc trực tiếp vào tab "Nội dung cuộc họp"

## Lưu ý

### Dependencies

Backend cần package:
- `puppeteer` (tự động cài Chromium khi install)

Cài đặt:
```bash
cd backend
npm install
```

### Performance & Security

- Puppeteer sử dụng khá nhiều RAM
- Nên giới hạn số request đồng thời
- Rate limiting đã được implement
- Route hiện chưa được bảo vệ bằng authentication - nên bật trong production

### Authentication

Route `/api/audio-to-text/convert` hiện chưa được bảo vệ bằng authentication. 
**Nên bật authentication trong production** bằng cách uncomment dòng `authenticate` trong `backend/src/routes/audioToText.route.ts`.

## Troubleshooting

### Lỗi: "Không thể kết nối đến dịch vụ chuyển đổi audio"

**Nguyên nhân**: Trang web không khả dụng hoặc Puppeteer không thể truy cập.

**Giải pháp**:
1. Kiểm tra kết nối internet
2. Kiểm tra trang web có đang hoạt động không
3. Kiểm tra Puppeteer đã cài đặt đúng chưa: `npm install puppeteer`
4. Sử dụng phương án thủ công (fallback)

### Lỗi: "No audio file was uploaded"

**Nguyên nhân**: File audio không được upload đúng cách.

**Giải pháp**:
1. Kiểm tra file audio có hợp lệ không
2. Kiểm tra kích thước file (max 100MB)
3. Kiểm tra format file (mp3, wav, m4a, webm, ogg, aac, flac)

### Văn bản không chính xác

**Nguyên nhân**: Chất lượng audio kém hoặc có nhiều tiếng ồn.

**Giải pháp**:
1. Sử dụng microphone chất lượng tốt khi ghi âm
2. Ghi âm ở nơi yên tĩnh
3. Chỉnh sửa văn bản sau khi extract để sửa lỗi

## Tương lai

- [x] ✅ Automation tool với Puppeteer
- [ ] Thêm hỗ trợ nhiều ngôn ngữ
- [ ] Thêm tùy chọn chỉnh sửa văn bản trực tiếp trong editor
- [ ] Thêm tính năng tự động format văn bản (thêm dấu câu, phân đoạn)
- [ ] Cache kết quả chuyển đổi để tránh chuyển đổi lại cùng một file
- [ ] Thêm retry mechanism cho automation
- [ ] Thêm queue để xử lý nhiều request đồng thời
- [ ] Nếu daotao.abaii.vn có API trong tương lai, có thể chuyển sang API

