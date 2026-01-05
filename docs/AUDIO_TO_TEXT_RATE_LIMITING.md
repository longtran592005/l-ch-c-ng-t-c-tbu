# Rate Limiting và Queue cho Audio-to-Text Conversion

## Vấn đề

Khi upload file audio để chuyển đổi sang text, bạn có thể gặp lỗi:
```
Too many requests, please try again later
```

## Nguyên nhân

1. **Rate Limiting chung**: Backend có rate limiting áp dụng cho tất cả routes (100 requests/phút)
2. **Thời gian xử lý lâu**: Mỗi request audio-to-text có thể mất vài phút để hoàn thành
3. **Nhiều request đồng thời**: Nếu có nhiều request cùng lúc, Puppeteer không thể xử lý song song

## Giải pháp đã triển khai

### 1. Rate Limiter riêng cho Audio-to-Text

Đã tạo rate limiter riêng với giới hạn thấp hơn nhưng phù hợp:

```typescript
// Chỉ cho phép 3 requests trong 10 phút (production)
// 5 requests trong 10 phút (development)
audioToTextRateLimiter
```

**Lý do**:
- Mỗi request mất nhiều thời gian (có thể vài phút)
- Puppeteer chỉ có thể xử lý một request tại một thời điểm
- Tránh quá tải server và trang web đích

### 2. Queue System

Đã thêm queue để xử lý tuần tự các request:

```typescript
// Các request được đưa vào queue
conversionQueue.push({ filePath, originalFilename, resolve, reject });

// Xử lý tuần tự từng request
processQueue();
```

**Lợi ích**:
- Tránh xung đột khi nhiều request cùng lúc
- Đảm bảo mỗi request được xử lý đầy đủ
- Dễ dàng theo dõi số lượng request đang chờ

## Cấu hình

### Rate Limiter

File: `backend/src/middleware/rateLimiter.middleware.ts`

```typescript
export const audioToTextRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 phút
  max: 3, // 3 requests trong 10 phút (production)
  // Development: 5 requests
});
```

### Queue

File: `backend/src/services/audioToTextAutomation.service.ts`

- Queue tự động xử lý tuần tự
- Không cần cấu hình thêm

## Cách sử dụng

### Khi gặp lỗi "Too many requests"

1. **Chờ một chút**: Rate limiter reset sau 10 phút
2. **Kiểm tra queue**: Nếu có nhiều request đang chờ, hãy đợi
3. **Giảm số lượng request**: Không gửi quá nhiều request cùng lúc

### Best Practices

1. **Một request tại một thời điểm**: Đợi request hiện tại hoàn thành trước khi gửi request mới
2. **Không retry quá nhanh**: Nếu gặp lỗi, đợi ít nhất 1-2 phút trước khi retry
3. **Kiểm tra trạng thái**: Xem log để biết có bao nhiêu request đang chờ

## Monitoring

### Logs

Backend sẽ log:
```
[AudioToText] Processing queue item: filename.mp3 (2 items remaining)
```

### Response Headers

Rate limiter trả về headers:
- `X-RateLimit-Limit`: Số request tối đa
- `X-RateLimit-Remaining`: Số request còn lại
- `X-RateLimit-Reset`: Thời gian reset (Unix timestamp)

## Tùy chỉnh

### Tăng giới hạn (Development)

Sửa trong `rateLimiter.middleware.ts`:

```typescript
...(process.env.NODE_ENV === 'development' && {
  max: 10, // Tăng lên 10 requests
}),
```

### Tăng giới hạn (Production)

**Không khuyến nghị** vì:
- Mỗi request mất nhiều thời gian
- Puppeteer chỉ xử lý một request tại một thời điểm
- Có thể làm quá tải server

Nếu thực sự cần, sửa:

```typescript
max: 5, // Tăng từ 3 lên 5
```

### Tắt Rate Limiting (Không khuyến nghị)

Xóa middleware trong route:

```typescript
audioToTextRouter.post(
  '/audio-to-text/convert',
  // audioToTextRateLimiter, // Comment out
  uploadAudio.single('audioFile'),
  audioToTextController.handleConvertAudioToText
);
```

## Troubleshooting

### Lỗi: "Too many requests" ngay cả khi chỉ có 1 request

**Nguyên nhân**: Có thể do:
- Rate limiter chung (`apiRateLimiter`) đang áp dụng
- Có nhiều request khác đang chạy

**Giải pháp**:
1. Kiểm tra xem có request nào khác đang chạy không
2. Đợi một chút rồi thử lại
3. Kiểm tra logs để xem có request nào đang chờ trong queue

### Request bị treo lâu

**Nguyên nhân**: 
- File audio quá lớn
- Trang web đích xử lý chậm
- Network chậm

**Giải pháp**:
1. Kiểm tra kích thước file (nên < 50MB)
2. Kiểm tra network connection
3. Kiểm tra xem trang web đích có đang hoạt động không

### Queue không xử lý

**Nguyên nhân**: 
- Browser instance bị lỗi
- Puppeteer không thể khởi động

**Giải pháp**:
1. Restart backend server
2. Kiểm tra logs để xem lỗi cụ thể
3. Kiểm tra Puppeteer đã cài đặt đúng chưa

## Tương lai

- [ ] Thêm progress tracking cho queue
- [ ] Thêm webhook để notify khi conversion hoàn thành
- [ ] Thêm retry mechanism với exponential backoff
- [ ] Thêm metrics để monitor queue size và processing time

