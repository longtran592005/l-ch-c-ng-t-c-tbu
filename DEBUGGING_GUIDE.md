# 🔍 Debugging Guide: "Thêm Lịch" Button Not Working

## Issue: Click "Thêm mới" but nothing happens

Thực hiện từng bước này để tìm ra vấn đề:

---

## 📋 Step 1: Open Browser DevTools

**Action:**
1. Click F12 (hoặc Ctrl+Shift+I)
2. Go to **Console** tab
3. Look for any red error messages

**What to check:**
- ❌ JavaScript errors?
- ❌ Network errors?
- ❌ CORS issues?

---

## 📋 Step 2: Fill Form & Submit (Watch Console)

**Action:**
```
1. Open "Thêm lịch" dialog
2. Fill all required fields:
   ✅ Ngày (date)
   ✅ Bắt đầu (start time)
   ✅ Kết thúc (end time)
   ✅ Nội dung (content)
   ✅ Địa điểm (location)
   ✅ Lãnh đạo chủ trì (leader) - MUST select from dropdown
3. Click "Thêm mới" button
4. Watch Console immediately
```

**Expected Console Output:**

If form validation passes:
```
🔵 [Schedule] handleSubmit called - Current formData: {...}
🔵 [Schedule] Submitting schedule: {date: Date, startTime: "HH:MM", ...}
🔵 [Schedule] User info: {userId: "...", userName: "...", userRole: "..."}
🔵 [Schedule] Auth token exists: true
🔵 [Schedule] Creating new schedule
```

If form validation FAILS:
```
🔵 [Schedule] handleSubmit called - Current formData: {...}
❌ Validation failed: "Vui lòng điền đầy đủ..."
{date: false, startTime: true, endTime: true, ...}
```

---

## 🚨 Problem 1: "Validation failed" Message Shows

**Why:** One of these required fields is empty:
- ❌ Ngày (date)
- ❌ Bắt đầu (start time)
- ❌ Kết thúc (end time)
- ❌ Nội dung (content)
- ❌ Địa điểm (location)
- ❌ Lãnh đạo chủ trì (leader) - **MUST SELECT FROM DROPDOWN!**

**Check:** Look at console output showing which fields are false:
```
{date: false, startTime: true, endTime: true, ...}
              ↑ If false, this field is missing
```

**Fix:**
1. Click dialog again
2. Make sure to SELECT leader from dropdown (not just type)
3. Verify date is selected (not empty)
4. Check all text fields are filled
5. Try submit again

---

## 🚨 Problem 2: Console Shows All Fields Are True, But Still Nothing Happens

**Why:** API call is failing silently

**What to check:**

### Check Network Tab
```
1. DevTools → Network tab
2. Click "Thêm mới"
3. Look for request: POST /api/schedules
4. Click on it → View Details
```

**Expected Response:**
- Status: **201 Created** ✅
- Response body: { id, date, content, ... }

**If you see:**
- Status: **404** → Backend route not found
- Status: **401** → Not authenticated (no token)
- Status: **400** → Invalid data format
- Status: **500** → Backend error
- **No request appears** → Button not calling API

### If Status is 500 (Backend Error)

Click the response and read the error message:
```json
{
  "success": false,
  "error": {
    "message": "Cannot create schedule - specific error here"
  }
}
```

Common reasons:
- ❌ Database connection failed
- ❌ Prisma schema mismatch
- ❌ Missing required database field
- ❌ Invalid data format (e.g., date as string instead of Date)

---

## 🚨 Problem 3: Console Shows "❌ [Schedule] Submit error"

**Error message:** Check what it says

**Common errors:**

### 1. "Not authenticated" or "401"
```
❌ [Schedule] Submit error: {
  message: "Unauthorized",
  status: 401
}
```
**Fix:** User not logged in or token expired
- Logout and login again
- Check localStorage for "tbu_auth_token"

### 2. "Network error" or "Failed to fetch"
```
❌ [Schedule] Submit error: {
  message: "Failed to fetch",
  status: undefined
}
```
**Fix:** Backend not running
```bash
cd backend
npm run dev
# Should see: Express server listening on port 3000
```

### 3. Backend URL wrong
```
❌ [Schedule] Submit error: {
  message: "404 Not Found",
  status: 404
}
```
**Fix:** Check .env file
```bash
# File: .env (at root)
VITE_API_BASE_URL=http://localhost:3000
```
Should NOT be:
- `http://localhost:8080` (that's frontend)
- `http://localhost:5173` (that's Vite dev server)
- Empty or undefined

---

## 🧪 Testing Checklist

When everything is working, you should see this flow:

### ✅ Scenario 1: Form Validation Error
```
Action: Submit with missing field
Console: "Validation failed..."
UI: Red error toast appears
Dialog: Stays open ← Can retry
```

### ✅ Scenario 2: Successful Submit
```
Action: Submit with all fields filled
Console: "🔵 Creating new schedule"
Console: "✅ Success!"
Network: POST /api/schedules → 201
UI: Success toast appears
Dialog: Closes automatically ← Removed from screen
List: New item appears in table
Form: Resets (empty for next add)
Refresh: Item persists in database
```

### ✅ Scenario 3: Network Error
```
Action: Submit when backend is down
Console: "❌ Submit error: Failed to fetch"
UI: Red error toast: "Không thể lưu lịch..."
Dialog: Stays open ← Can retry after backend starts
```

---

## 🔧 Quick Fix Checklist

1. **Check backend is running:**
   ```bash
   # Should see log messages when you submit form
   # If no logs → backend not running
   ```

2. **Check frontend .env:**
   ```bash
   cat .env
   # Should show: VITE_API_BASE_URL=http://localhost:3000
   ```

3. **Check user is logged in:**
   ```javascript
   // In browser console:
   console.log(localStorage.getItem('tbu_auth_token'))
   // Should return a long string, not null
   ```

4. **Check form fields:**
   ```
   - Leader MUST be selected from dropdown
   - Date MUST be clicked in calendar picker
   - Times MUST have values
   - Text fields MUST not be empty
   ```

5. **Restart everything:**
   ```bash
   # Terminal 1
   cd backend && npm run dev
   
   # Terminal 2 (in project root)
   npm run dev
   
   # Browser: Refresh (Ctrl+F5 or Cmd+Shift+R)
   ```

---

## 📝 What to Report If Still Broken

If nothing works after all these steps, provide:

1. **Browser Console Output:**
   - Copy entire console log after clicking "Thêm mới"
   - Include all 🔵 and ❌ messages

2. **Network Tab Details:**
   - Right-click on failed request → Copy as cURL
   - Or show Response tab content

3. **Backend Console Output:**
   ```bash
   # Should show logs like:
   POST /api/schedules 201 Created
   # If you see nothing → button isn't reaching backend
   ```

4. **Your form data:**
   ```javascript
   // Copy from console when you submit:
   🔵 [Schedule] Submitting schedule: {...}
   // Paste exactly what it shows
   ```

---

## 💡 Pro Tips

### Enable More Logging
Open browser console and paste:
```javascript
// Get all schedule-related logs
const logs = document.querySelectorAll('[data-log]');
logs.forEach(l => console.log(l));
```

### Check Local Storage
```javascript
console.log({
  token: localStorage.getItem('tbu_auth_token'),
  user: localStorage.getItem('user'),
  all: { ...localStorage }
});
```

### Test API Directly
```javascript
// In browser console:
fetch('http://localhost:3000/api/schedules', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('tbu_auth_token')}`
  }
})
.then(r => r.json())
.then(d => console.log('API Response:', d))
.catch(e => console.error('API Error:', e));
```

---

**Good luck! 🚀 Report back with console logs if you're still stuck.**
