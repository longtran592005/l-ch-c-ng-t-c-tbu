# 🎯 Quick Action Plan

## Vấn Đề
**Bấm "Thêm lịch" → Không có phản ứng gì**

---

## Nguyên Nhân Có Thể
1. ❌ Field **"Lãnh đạo chủ trì" không được chọn** từ dropdown (chỉ là placeholder)
2. ❌ Một field bắt buộc khác không filled
3. ❌ Backend không chạy
4. ❌ Token hết hạn (cần login lại)

---

## 🚀 Làm Ngay

### Bước 1: Mở DevTools
```
F12 → Console tab
```

### Bước 2: Thử "Thêm lịch" lại
```
1. Click "Thêm lịch"
2. Fill form (QUAN TRỌNG: Chọn leader từ dropdown!)
3. Click "Thêm mới"
4. Watch console
```

### Bước 3: Kiểm tra Console Output
Tìm một trong những thông báo này:

#### ✅ Nếu thấy:
```
🔵 [Schedule] handleSubmit called - Current formData: {...}
🔵 [Schedule] Submitting schedule: {...}
```
→ **Form submit đang chạy** → Kiểm tra Network tab

#### ❌ Nếu thấy:
```
❌ Validation failed: "Vui lòng điền đầy đủ..."
{date: false, startTime: true, ...}
```
→ **Field chưa được fill** → Fill lại form, đặc biệt là Leader dropdown

#### ❌ Nếu không thấy gì:
```
(console trống)
```
→ **handleSubmit không được trigger** → Button có vấn đề hoặc React component re-render sai

---

## 📊 Check Network Tab

### Nếu console logs xuất hiện:
```
1. DevTools → Network tab
2. Filter: "schedules"
3. Bấm "Thêm mới"
4. Xem request: POST /api/schedules
5. Check Status code:
   - 201 ✅ = Thành công
   - 404 ❌ = Backend route không tìm thấy
   - 401 ❌ = Token lỗi (login lại)
   - 500 ❌ = Backend error
```

---

## 🔧 Backend Check

Mở terminal và chạy:

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Should see:
# Express server listening on port 3000
# Prisma client initialized
```

**If you see errors:**
- Database connection failed → Fix .env DATABASE_URL
- Port 3000 already in use → `kill -9 $(lsof -ti:3000)` then try again

---

## 🖥️ Frontend Check

```bash
# Terminal 2: Frontend (tại root folder)
npm run dev

# Should see:
# VITE v... ready in ... ms
# Local: http://localhost:8080
```

**If you see errors:**
- node_modules issue → `rm -rf node_modules && npm install`
- Port 8080 occupied → `kill -9 $(lsof -ti:8080)` then try again

---

## ✅ When Everything Works

You'll see:
```
✅ Console: "🔵 [Schedule] Creating new schedule"
✅ Console: "✅ [Schedule] Success! Dialog closing..."
✅ Network: POST /api/schedules → 201 Created
✅ UI: Success toast appears
✅ Dialog: Closes automatically
✅ Table: New item appears
✅ Refresh page: Item still there
```

---

## 🆘 If Still Broken

**Capture these and send:**

1. **Console Output:**
   - Select all console text (Ctrl+A)
   - Copy (Ctrl+C)
   - Paste in report

2. **Network Response:**
   - DevTools → Network tab
   - POST /api/schedules → Response tab
   - Screenshot or copy response

3. **Backend Logs:**
   - Terminal output from `npm run dev`
   - Screenshot showing if anything appears

4. **Browser Info:**
   - What browser? (Chrome, Firefox, etc.)
   - Are you logged in?
   - Does token exist?
```javascript
localStorage.getItem('tbu_auth_token') // Should not be null
```

---

## 📚 Full Debugging Guide

See: `DEBUGGING_GUIDE.md` (detailed step-by-step guide)

---

**Start with checking console output and network tab. Report back with what you find!** 🚀
