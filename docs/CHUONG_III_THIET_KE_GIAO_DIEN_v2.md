# CHƯƠNG III. THIẾT KẾ GIAO DIỆN VÀ CHỨC NĂNG

## 3.1. Giao diện trang chủ công khai

### 3.1.1. Thanh điều hướng (Header)
a) Thanh thông tin trên cùng (Top Bar)
*	Hiển thị thông tin liên hệ:
-	Số điện thoại hotline.
-	Địa chỉ email.
-	Địa chỉ trụ sở chính.
*	Liên kết mạng xã hội:
-	Facebook, YouTube, v.v.
*	Vị trí: Cố định trên cùng trang.

b) Menu điều hướng chính (Main Navigation)
*	Logo Trường Đại học Thái Bình:
-	Nằm bên trái.
-	Click để quay về trang chủ.
*	Các mục menu:
-	Trang chủ.
-	Lịch công tác.
-	Tin tức.
-	Thông báo.
-	Giới thiệu.
*	Nút "Đăng nhập":
-	Nằm góc phải.
-	Dẫn đến trang đăng nhập hệ thống.
*	Responsive:
-	Trên mobile thu gọn thành menu hamburger (☰).

**Hình 3.1**: Giao diện thanh điều hướng

### 3.1.2. Banner chính (Hero Section)
a) Hình ảnh nền
*	Sử dụng hình ảnh khuôn viên cổng trường Đại học Thái Bình.
*	Lớp phủ gradient màu xanh navy tạo độ tương phản.
*	Hiệu ứng trang trí:
-	Các vòng tròn blur màu vàng (accent) ở góc.
-	Sóng SVG ở đáy tạo chuyển tiếp mềm mại.

b) Nội dung chính
*	Badge thông báo:
-	"Chào mừng kỷ niệm 65 năm thành lập (1960 - 2025)".
*	Tiêu đề lớn:
-	"TRƯỜNG ĐẠI HỌC THÁI BÌNH".
-	Font chữ Serif, màu trắng.
*	Mô tả phụ:
-	"Hệ thống Quản lý và Công bố Lịch Công Tác Tuần".
-	"Ban Giám hiệu Trường Đại học Thái Bình".
*	Hai nút hành động (CTA):
-	"Xem lịch công tác": Nút màu vàng nổi bật.
-	"Giới thiệu": Nút viền trắng.

**Hình 3.2**: Giao diện Banner chính trang chủ

### 3.1.3. Khu vực xem nhanh lịch công tác
a) Bố cục
*	Chiếm 2/3 chiều rộng màn hình (desktop).
*	Tiêu đề: "Lịch công tác tuần".
*	Link "Xem đầy đủ" dẫn đến trang lịch chi tiết.

b) Danh sách lịch công tác
*	Hiển thị 5 lịch công tác gần nhất.
*	Mỗi card hiển thị:
-	Ngày và thứ trong tuần.
-	Thời gian bắt đầu.
-	Badge "Hôm nay" (nếu là ngày hiện tại).
-	Nội dung cuộc họp/sự kiện.
-	Địa điểm.
-	Người chủ trì.
*	Trường hợp không có lịch:
-	Hiển thị icon Calendar mờ.
-	Thông báo "Chưa có lịch công tác được duyệt".

**Hình 3.3**: Khu vực xem nhanh lịch công tác

### 3.1.4. Khu vực tin tức và thông báo
a) Tin tức mới nhất
*	Chiếm 1/3 chiều rộng (sidebar).
*	Tiêu đề: "Tin tức mới".
*	Hiển thị 4 tin tức mới nhất dạng card:
-	Hình thumbnail.
-	Tiêu đề bài viết (giới hạn 2 dòng).
-	Ngày đăng và tác giả.

b) Thông báo quan trọng
*	Tiêu đề: "Thông báo".
*	Hiển thị 4 thông báo mới nhất.
*	Badge màu theo mức độ ưu tiên:
-	Đỏ: Khẩn cấp.
-	Vàng: Quan trọng.
-	Xám: Thông thường.

**Hình 3.4**: Khu vực tin tức và thông báo

### 3.1.5. Chân trang (Footer)
a) Cột thông tin trường
*	Logo và tên trường.
*	Địa chỉ: Phố Lý Bôn, TP. Thái Bình.
*	Điện thoại liên hệ.
*	Email liên hệ.

b) Cột liên kết nhanh
*	Trang chủ.
*	Lịch công tác.
*	Tin tức.
*	Thông báo.
*	Giới thiệu.

c) Cột liên hệ
*	Hotline.
*	Email hỗ trợ.
*	Thông tin bản quyền.

**Hình 3.5**: Giao diện chân trang

---

## 3.2. Giao diện đăng nhập

### 3.2.1. Màn hình đăng nhập
a) Header form
*	Logo Đại học Thái Bình (80x80px).
*	Tiêu đề: "Đăng nhập hệ thống".
*	Mô tả: "Hệ thống Quản lý Lịch Công Tác Tuần".

b) Form đăng nhập
*	Trường Email:
-	Icon thư ở bên trái.
-	Placeholder: "email@tbu.edu.vn".
*	Trường Mật khẩu:
-	Icon khóa ở bên trái.
-	Icon mắt ở bên phải để hiện/ẩn mật khẩu.
-	Placeholder: "••••••••".
*	Checkbox "Ghi nhớ đăng nhập".
*	Nút "Đăng nhập":
-	Chiều rộng 100%.
-	Màu xanh navy (primary).
*	Link "Quên mật khẩu?".

c) Xử lý lỗi
*	Sai tài khoản/mật khẩu:
-	Hiển thị thông báo lỗi màu đỏ.
-	Yêu cầu nhập lại.
*	Validation:
-	Kiểm tra định dạng email.
-	Mật khẩu tối thiểu 6 ký tự.

**Hình 3.6**: Giao diện đăng nhập

---

## 3.3. Giao diện xem lịch công tác

### 3.3.1. Header trang lịch
a) Phần tiêu đề
*	Nền màu xanh navy (primary).
*	Icon Calendar trong vòng tròn màu vàng.
*	Tiêu đề: "Lịch Công Tác".
*	Mô tả: "Lịch công tác tuần của Ban Giám hiệu".
*	Nút "Làm mới" để reload dữ liệu.

b) Breadcrumb
*	Hiển thị đường dẫn: Trang chủ > Lịch công tác.
*	Nền màu xám nhạt.

**Hình 3.7**: Header trang lịch công tác

### 3.3.2. Chế độ xem theo Tuần
a) Thanh điều khiển
*	Tabs chuyển đổi: "Theo Tuần" | "Theo Tháng".
*	Điều hướng thời gian:
-	Nút mũi tên trái: Tuần trước.
-	Nút "Hôm nay": Quay về tuần hiện tại.
-	Nút mũi tên phải: Tuần sau.
-	Hiển thị: "06/01 - 12/01/2025".
-	Hiển thị: "Tuần 2 năm 2025".
*	Các nút chức năng:
-	Icon máy in: In lịch công tác.
-	Icon tải xuống: Xuất file Excel.

b) Bảng lịch công tác
*	Các cột hiển thị:
-	Thứ: Thứ trong tuần + ngày tháng.
-	Buổi: Sáng / Chiều.
-	Nội dung: Nội dung cuộc họp.
-	Thành phần: Người tham dự.
-	Địa điểm: Phòng họp.
-	Chủ trì: Lãnh đạo chủ trì.
-	Đơn vị chuẩn bị: Đơn vị chịu trách nhiệm.
-	Ghi chú: Thông tin bổ sung.
*	Đặc điểm thiết kế:
-	Highlight ngày hôm nay bằng màu primary nhạt.
-	Merge cells cho các buổi cùng ngày.
-	Hiển thị "Không có lịch" nếu ngày trống.

**Hình 3.8**: Chế độ xem lịch theo tuần

### 3.3.3. Chế độ xem theo Tháng
a) Điều hướng
*	Nút mũi tên trái: Tháng trước.
*	Nút mũi tên phải: Tháng sau.
*	Hiển thị tên tháng và năm: "Tháng 1, 2025".

b) Lưới tháng
*	Header: Thứ 2 | Thứ 3 | ... | Chủ Nhật.
*	Các ô ngày hiển thị:
-	Số ngày.
-	Số lượng sự kiện (chấm tròn màu).
*	Click vào ô ngày để xem chi tiết.
*	Màu sắc phân biệt:
-	Ngày có sự kiện: Chấm tròn màu primary.
-	Ngày hôm nay: Viền và nền highlight.
-	Ngày thuộc tháng khác: Màu nhạt hơn.

**Hình 3.9**: Chế độ xem lịch theo tháng

### 3.3.4. Tính năng in và xuất file
a) In lịch công tác
*	Click icon máy in.
*	Mở cửa sổ in của trình duyệt.
*	Bố cục tối ưu cho khổ giấy A4 ngang.
*	Header in: Logo + "Lịch công tác tuần số X năm YYYY".

b) Xuất file Excel
*	Click icon tải xuống.
*	Tự động tải file .xlsx về máy.
*	Tên file: "LichCongTac_Tuan_X_YYYY.xlsx".

**Hình 3.10**: Giao diện in và xuất lịch

---

## 3.4. Giao diện Trợ lý AI Chatbot

### 3.4.1. Nút kích hoạt Chatbot
a) Thiết kế nút
*	Vị trí: Góc dưới bên phải màn hình.
*	Hình dạng: Tròn, đường kính 56px.
*	Màu sắc: Gradient xanh dương - tím.
*	Icon: Ngôi sao lấp lánh (Sparkles) màu trắng.
*	Hiệu ứng: Animation pulse thu hút sự chú ý.
*	Tooltip: "Trợ lý ảo TBU".

**Hình 3.11**: Nút kích hoạt Chatbot

### 3.4.2. Cửa sổ Chat
a) Kích thước và vị trí
*	Chiều rộng: 400px.
*	Chiều cao: 600px (tối đa 80% viewport).
*	Vị trí: Góc dưới phải, cách cạnh 24px.
*	Animation: Slide-in từ dưới lên.

b) Header cửa sổ
*	Nền: Gradient xanh dương - tím.
*	Avatar bot: Vòng tròn chứa icon ngôi sao màu vàng.
*	Chấm tròn xanh lá: Trạng thái "Online".
*	Tên: "Trợ lý ảo TBU".
*	Mô tả: "Luôn sẵn sàng hỗ trợ".
*	Nút làm mới: Icon xoay để reset cuộc hội thoại.
*	Nút đóng: Icon X.

c) Khu vực tin nhắn
*	Nền: Màu xám nhạt.
*	Thanh cuộn mượt mà.
*	Hiển thị ngày hiện tại ở giữa.

**Hình 3.12**: Cửa sổ Chatbot

### 3.4.3. Tin nhắn chào mừng
a) Nội dung
*	Lời chào: "Xin chào! 👋".
*	Giới thiệu: "Tôi là Trợ lý ảo TBU".
*	Danh sách hỗ trợ:
-	📅 Lịch công tác: Xem lịch hôm nay, tuần này.
-	📰 Tin tức & Thông báo.
-	🏫 Thông tin trường.

b) Các câu hỏi gợi ý
*	📅 Lịch công tác hôm nay.
*	📅 Lịch tuần này.
*	📰 Tin tức mới nhất.
*	📢 Thông báo quan trọng.
*	🎓 Thông tin tuyển sinh.
*	Click để gửi nhanh câu hỏi.

**Hình 3.13**: Tin nhắn chào mừng Chatbot

### 3.4.4. Giao diện hội thoại
a) Tin nhắn người dùng
*	Vị trí: Căn phải.
*	Nền: Gradient xanh dương - tím.
*	Chữ: Màu trắng.

b) Tin nhắn Bot
*	Vị trí: Căn trái.
*	Avatar bot nhỏ kèm theo.
*	Nền: Trắng/xám nhạt.
*	Hỗ trợ định dạng: In đậm, danh sách, link.

c) Input nhập tin nhắn
*	Placeholder: "Nhập câu hỏi...".
*	Icon microphone: Nhập bằng giọng nói.
*	Nút gửi: Icon mũi tên.
*	Hỗ trợ phím Enter để gửi nhanh.

d) Trạng thái đang xử lý
*	Hiển thị 3 dấu chấm nhấp nháy.
*	Vô hiệu hóa input trong khi chờ.

**Hình 3.14**: Giao diện hội thoại với Chatbot

### 3.4.5. Tính năng nhập giọng nói
a) Quy trình sử dụng
*	Click icon microphone trong input.
*	Icon chuyển thành màu đỏ (đang ghi âm).
*	Nói câu hỏi bằng tiếng Việt.
*	Hệ thống chuyển đổi thành văn bản.
*	Tự động gửi khi kết thúc nói.

b) Yêu cầu
*	Trình duyệt Chrome hoặc Edge.
*	Cấp quyền Microphone.

**Hình 3.15**: Tính năng nhập giọng nói Chatbot

---

## 3.5. Giao diện quản trị (Admin)

### 3.5.1. Layout quản trị
a) Sidebar (Thanh bên trái)
*	Chiều rộng: 256px.
*	Nền: Màu xanh navy (primary).
*	Header sidebar:
-	Logo Đại học Thái Bình.
-	Tên: "ĐẠI HỌC THÁI BÌNH".
-	Mô tả: "Hệ thống quản trị".
*	Menu điều hướng:
-	Tổng quan.
-	Lịch công tác.
-	Quản lý lịch.
-	Ghi chú.
-	Nội dung cuộc họp.
-	Tin tức.
-	Thông báo.
-	Người dùng (chỉ Admin).
-	Cài đặt.
-	Cấu hình AI (Admin/BGH).
*	Footer sidebar:
-	Avatar người dùng (chữ cái đầu tên).
-	Tên đăng nhập.
-	Email.

b) Header (Thanh trên)
*	Nền trắng với border dưới.
*	Tiêu đề trang hiện tại.
*	Ô tìm kiếm (ẩn trên mobile).
*	Icon chuông thông báo với badge số lượng chưa đọc.
*	Menu dropdown tài khoản.

c) Vùng nội dung chính
*	Padding xung quanh.
*	Responsive: Thu gọn sidebar trên mobile.

**Hình 3.16**: Layout giao diện quản trị

### 3.5.2. Trang Tổng quan (Dashboard)
a) Các thẻ thống kê
*	Lịch công tác tuần này:
-	Số lượng lịch trong tuần.
-	Icon Calendar, màu primary.
*	Cuộc họp:
-	Số cuộc họp đã phân loại.
-	Icon đồng hồ, màu xanh dương.
*	Hội nghị:
-	Số hội nghị đã phân loại.
-	Icon check, màu tím.
*	Tin tức & Thông báo:
-	Tổng số tin tức + thông báo.
-	Icon tài liệu, màu xanh dương.

b) Lịch công tác gần đây
*	Chiếm 2/3 chiều rộng.
*	Danh sách 5 lịch gần nhất đã phân loại.
*	Hiển thị: Ngày, giờ, loại sự kiện, nội dung, địa điểm.
*	Link "Xem tất cả".

c) Thao tác nhanh
*	Nút "Thêm lịch công tác": Màu primary.
*	Nút "Đăng tin tức": Màu secondary.
*	Nút "Thêm thông báo": Màu secondary.

d) Mục chưa phân loại
*	Hiển thị 3 lịch chưa được phân loại.
*	Nhắc nhở quản trị viên cần xử lý.

**Hình 3.17**: Trang Tổng quan quản trị

---

## 3.6. Giao diện Quản lý Lịch công tác

### 3.6.1. Danh sách lịch công tác
a) Thanh công cụ
*	Ô tìm kiếm:
-	Tìm theo nội dung, người chủ trì.
*	Dropdown lọc theo loại sự kiện:
-	Tất cả | Cuộc họp | Hội nghị | Tạm ngưng.
*	Nút "Thêm lịch công tác mới": Icon dấu cộng.

b) Bảng dữ liệu
*	Các cột:
-	Ngày: Thứ + ngày/tháng.
-	Thời gian: Giờ bắt đầu - Giờ kết thúc.
-	Nội dung: Tiêu đề cuộc họp.
-	Địa điểm: Phòng họp.
-	Chủ trì: Tên lãnh đạo.
-	Loại: Badge màu (Cuộc họp/Hội nghị/Tạm ngưng).
-	Trạng thái: Badge (Đã duyệt/Chờ duyệt/Chưa duyệt/Đã hủy).
-	Thao tác: Menu dropdown (Sửa/Duyệt/Xóa).
*	Highlight:
-	Hàng chứa lịch hôm nay được highlight màu primary nhạt.

c) Phân trang
*	Hiển thị 8 mục/trang.
*	Nút điều hướng: Đầu | Trước | Số trang | Sau | Cuối.
*	Tự động chuyển đến trang chứa ngày hôm nay.

**Hình 3.18**: Danh sách quản lý lịch công tác

### 3.6.2. Dialog thêm/sửa lịch công tác
a) Các trường thông tin
*	Ngày (bắt buộc):
-	Chọn từ calendar popup.
*	Giờ bắt đầu (bắt buộc):
-	Format HH:MM.
*	Giờ kết thúc:
-	Format HH:MM.
*	Nội dung (bắt buộc):
-	Textarea mô tả chi tiết.
*	Địa điểm (bắt buộc):
-	Input phòng họp.
*	Chủ trì (bắt buộc):
-	Input/Select tên lãnh đạo.
*	Thành phần tham dự:
-	Input danh sách người tham dự.
*	Đơn vị chuẩn bị (bắt buộc):
-	Input đơn vị chịu trách nhiệm.
*	Đơn vị phối hợp:
-	Input các đơn vị phối hợp.
*	Loại sự kiện:
-	Select: Cuộc họp / Hội nghị / Tạm ngưng.

b) Các nút thao tác
*	"Hủy": Đóng dialog không lưu.
*	"Lưu": Lưu thông tin.
*	"Lưu và duyệt": Lưu đồng thời duyệt luôn.

**Hình 3.19**: Dialog thêm/sửa lịch công tác

### 3.6.3. Nhập liệu bằng giọng nói (Voice Guided Form)
a) Cách sử dụng
*	Click nút "Nhập bằng giọng nói" (icon microphone).
*	Form chuyển sang chế độ Voice Mode.
*	Hệ thống đọc hướng dẫn cho từng trường.
*	Người dùng nói thông tin.
*	AI tự động điền vào form.
*	Xác nhận và lưu.

b) Các trường hỗ trợ voice input
*	Ngày: "ngày 15 tháng 1 năm 2025".
*	Thời gian: "8 giờ sáng", "14:30".
*	Nội dung cuộc họp.
*	Địa điểm.
*	Chủ trì.
*	Thành phần tham dự.
*	Đơn vị chuẩn bị.
*	Đơn vị phối hợp.

c) Chỉ báo trạng thái
*	Icon microphone đỏ: Đang ghi âm.
*	Icon check xanh: Trường đã hoàn thành.
*	Highlight trường hiện tại đang nhập.

**Hình 3.20**: Nhập liệu bằng giọng nói

### 3.6.4. Giao diện duyệt lịch
a) Trạng thái lịch
*	Draft (Chưa duyệt): Badge màu cam.
*	Pending (Chờ duyệt): Badge màu vàng.
*	Approved (Đã duyệt): Badge màu xanh lá.
*	Cancelled (Đã hủy): Badge màu đỏ.

b) Thao tác duyệt
*	Click menu "..." bên phải hàng lịch.
*	Chọn "Duyệt" hoặc "Hủy duyệt".
*	Dialog xác nhận hiện lên.
*	Hiển thị thông báo kết quả.

**Hình 3.21**: Giao diện duyệt lịch công tác

---

## 3.7. Giao diện Nội dung cuộc họp

### 3.7.1. Bố cục trang
a) Cột trái - Danh sách (30%)
*	Nút "Tạo biên bản mới" phía trên.
*	Danh sách các cuộc họp dạng card nhỏ:
-	Tiêu đề cuộc họp.
-	Ngày họp.
-	Trạng thái.
*	Click để xem chi tiết bên phải.
*	Nút xóa với dialog xác nhận.

b) Cột phải - Chi tiết (70%)
*	Nội dung chi tiết biên bản đang chọn.
*	Nếu chưa chọn: Placeholder "Chọn một mục để xem chi tiết".

**Hình 3.22**: Bố cục trang biên bản cuộc họp

### 3.7.2. Chi tiết biên bản - Tab Chi tiết
a) Thông tin cơ bản
*	Tiêu đề: Tên cuộc họp.
*	Ngày họp: DD/MM/YYYY.
*	Thời gian: HH:MM - HH:MM.
*	Địa điểm: Phòng họp.
*	Chủ trì: Tên lãnh đạo.
*	Thành phần: Danh sách người tham dự.
*	Trạng thái: Badge (Draft/Completed/Archived).

**Hình 3.23**: Tab Chi tiết biên bản

### 3.7.3. Chi tiết biên bản - Tab Nội dung
a) Rich Text Editor
*	Toolbar định dạng:
-	Bold, Italic.
-	Heading.
-	Danh sách.
-	Link.
*	Vùng soạn thảo nội dung.
*	Nút "Lưu nội dung".

**Hình 3.24**: Tab Nội dung biên bản

### 3.7.4. Chi tiết biên bản - Tab Biên bản
a) Khi chưa có biên bản
*	Hiển thị placeholder.
*	Nút "Tạo biên bản từ AI".

b) Khi đã có biên bản
*	Hiển thị nội dung biên bản.
*	Nút "Xóa biên bản" để tạo lại.
*	Nút "Xuất file" để tải về.

**Hình 3.25**: Tab Biên bản cuộc họp

### 3.7.5. Chi tiết biên bản - Tab Phân tích AI
a) Các mục phân tích
*	Tóm tắt cuộc họp.
*	Danh sách Action Items.
*	Phân tích chuyên sâu.
*	Insights và đề xuất.

b) Giao diện
*	Mỗi mục có icon và tiêu đề riêng.
*	Nút làm mới để tạo lại phân tích.

**Hình 3.26**: Tab Phân tích AI

### 3.7.6. Ghi âm và Upload Audio
a) Ghi âm trực tiếp
*	Nút "Ghi âm" mở dialog ghi âm.
*	Hiển thị sóng âm thanh realtime.
*	Nút: Start / Stop / Pause.
*	Tự động lưu file sau khi dừng.

b) Upload file audio
*	Nút "Tải lên file ghi âm".
*	Hỗ trợ: .mp3, .wav, .m4a, .ogg, .webm.
*	Hiển thị progress upload.

c) Danh sách file đã upload
*	Tên file, thời lượng, ngày upload.
*	Audio Player để nghe lại.
*	Nút "Chuyển thành văn bản".
*	Nút xóa file.

**Hình 3.27**: Ghi âm và upload audio

### 3.7.7. Chuyển đổi Audio sang Text
a) Giao diện chuyển đổi
*	Chọn file audio cần chuyển đổi.
*	Click nút "Chuyển thành văn bản".
*	Hiển thị progress bar với tỷ lệ %.
*	Kết quả văn bản hiển thị trong Editor.

b) Chỉnh sửa kết quả
*	Có thể chỉnh sửa văn bản thủ công.
*	Nút "Lưu" để lưu vào nội dung cuộc họp.

**Hình 3.28**: Chuyển đổi Audio sang Text

### 3.7.8. Tạo biên bản AI
a) Quy trình tạo
*	Click tab "Biên bản".
*	Click nút "Tạo biên bản từ AI".
*	Chọn template biên bản:
-	Biên bản cuộc họp tổng quát.
-	Biên bản họp giao ban.
-	Biên bản họp BGH.
*	Hiển thị loading trong khi AI xử lý.
*	Hiển thị kết quả biên bản.

b) Nội dung biên bản AI tạo ra
*	Tiêu đề cuộc họp.
*	Thời gian, địa điểm.
*	Thành phần tham dự.
*	Nội dung chi tiết từng mục.
*	Các quyết định và kết luận.
*	Phân công nhiệm vụ.

**Hình 3.29**: Tạo biên bản bằng AI

---

## 3.8. Giao diện Quản lý Tin tức

### 3.8.1. Danh sách tin tức
a) Thanh công cụ
*	Ô tìm kiếm tin tức.
*	Nút "Thêm tin tức".

b) Danh sách dạng Card
*	Mỗi card hiển thị:
-	Hình ảnh thumbnail (nếu có).
-	Tiêu đề bài viết.
-	Tóm tắt (giới hạn 2 dòng).
-	Tác giả và ngày đăng.
-	Badge trạng thái "Đã đăng".
-	Các nút: Xem | Sửa | Xóa.

**Hình 3.30**: Danh sách quản lý tin tức

### 3.8.2. Dialog thêm/sửa tin tức
a) Các trường thông tin
*	Tiêu đề (bắt buộc):
-	Input text, tối đa 500 ký tự.
*	Tóm tắt (bắt buộc):
-	Textarea mô tả ngắn gọn.
*	Nội dung:
-	Rich Text Editor hỗ trợ định dạng.
*	Hình ảnh:
-	URL ảnh hoặc upload.
*	Danh mục:
-	Select (Tin tức/Sự kiện/Thông cáo...).

b) Nút thao tác
*	"Hủy": Đóng không lưu.
*	"Lưu": Lưu và đăng tin.

**Hình 3.31**: Dialog thêm/sửa tin tức

---

## 3.9. Giao diện Quản lý Thông báo

### 3.9.1. Danh sách thông báo
a) Thanh công cụ
*	Ô tìm kiếm thông báo.
*	Nút "Thêm thông báo".

b) Danh sách dạng Card
*	Mỗi card hiển thị:
-	Badge mức độ ưu tiên:
	-	Khẩn cấp: Đỏ.
	-	Quan trọng: Vàng/cam.
	-	Thông thường: Xám.
-	Tiêu đề.
-	Nội dung (rút gọn).
-	Người tạo và ngày đăng.
-	Các nút: Xem | Sửa | Xóa.

**Hình 3.32**: Danh sách quản lý thông báo

### 3.9.2. Dialog thêm/sửa thông báo
a) Các trường thông tin
*	Tiêu đề (bắt buộc):
-	Input text.
*	Nội dung (bắt buộc):
-	Textarea.
*	Mức độ ưu tiên:
-	Select: Thông thường / Quan trọng / Khẩn cấp.

b) Nút thao tác
*	"Hủy": Đóng không lưu.
*	"Lưu": Lưu thông báo.

**Hình 3.33**: Dialog thêm/sửa thông báo

---

## 3.10. Giao diện Quản lý Người dùng

### 3.10.1. Yêu cầu quyền truy cập
*	Chỉ Admin mới truy cập được trang này.
*	Nếu không có quyền:
-	Hiển thị icon khóa.
-	Thông báo "Không có quyền truy cập".
-	Mô tả "Bạn cần tài khoản Admin để quản lý người dùng".

**Hình 3.34**: Thông báo không có quyền truy cập

### 3.10.2. Danh sách người dùng
a) Thanh công cụ
*	Ô tìm kiếm theo tên/email.
*	Nút "Thêm người dùng".

b) Bảng dữ liệu
*	Các cột:
-	Tên: Họ tên người dùng.
-	Email: Địa chỉ email.
-	Vai trò: Badge màu.
	-	Admin: Đỏ.
	-	BGH: Xanh primary.
	-	Nhân viên: Xám.
	-	Người xem: Outline.
-	Phòng ban: Tên phòng ban.
-	Trạng thái: Badge.
	-	Hoạt động: Xanh.
	-	Đã khóa: Xám.
-	Thao tác: Sửa | Reset mật khẩu | Khóa/Mở | Xóa.

**Hình 3.35**: Danh sách quản lý người dùng

### 3.10.3. Dialog thêm/sửa người dùng
a) Các trường thông tin
*	Họ tên (bắt buộc).
*	Email (bắt buộc):
-	Validate định dạng email.
*	Mật khẩu (bắt buộc khi tạo mới):
-	Tối thiểu 6 ký tự.
*	Vai trò:
-	Select: Admin / Ban Giám hiệu / Nhân viên / Người xem.
*	Phòng ban:
-	Input text.
*	Trạng thái:
-	Active / Inactive.

b) Nút thao tác
*	"Hủy": Đóng không lưu.
*	"Lưu": Lưu người dùng.

**Hình 3.36**: Dialog thêm/sửa người dùng

### 3.10.4. Reset mật khẩu
a) Quy trình
*	Click icon chìa khóa tại hàng người dùng.
*	Dialog xác nhận hiện lên.
*	Nhập mật khẩu mới.
*	Click "Xác nhận".
*	Hiển thị thông báo thành công.

**Hình 3.37**: Dialog reset mật khẩu

---

## 3.11. Giao diện Cài đặt

### 3.11.1. Thông tin tài khoản
a) Card thông tin
*	Hiển thị họ tên (không chỉnh sửa được).
*	Hiển thị email (không chỉnh sửa được).
*	Dữ liệu lấy từ phiên đăng nhập hiện tại.

**Hình 3.38**: Card thông tin tài khoản

### 3.11.2. Đổi mật khẩu
a) Form đổi mật khẩu
*	Mật khẩu hiện tại:
-	Input password.
-	Icon hiện/ẩn mật khẩu.
*	Mật khẩu mới:
-	Input password.
-	Tối thiểu 6 ký tự.
-	Icon hiện/ẩn mật khẩu.
*	Xác nhận mật khẩu mới:
-	Input password.
-	Icon hiện/ẩn mật khẩu.
*	Nút "Xác nhận đổi mật khẩu".

b) Validation
*	Mật khẩu mới và xác nhận phải khớp nhau.
*	Hiển thị thông báo lỗi nếu không khớp.
*	Hiển thị thông báo thành công khi đổi xong.

**Hình 3.39**: Giao diện đổi mật khẩu

### 3.11.3. Cài đặt giao diện
a) Chế độ sáng/tối
*	Toggle switch chuyển đổi Dark Mode.
*	Icon mặt trời (Light) / mặt trăng (Dark).
*	Lưu preference vào bộ nhớ.

**Hình 3.40**: Cài đặt chế độ sáng/tối

---

## 3.12. Giao diện Cấu hình AI

### 3.12.1. Yêu cầu quyền
*	Chỉ Admin hoặc Ban Giám hiệu được truy cập.
*	Icon Sparkles (ngôi sao) trong sidebar.

### 3.12.2. Trạng thái AI Services
a) Card trạng thái
*	AI Service Status:
-	Icon check xanh: Hoạt động.
-	Icon X đỏ: Không hoạt động.
*	Embedding Model: Tên model đang sử dụng.
*	LLM Model: Tên model đang sử dụng.
*	Vector Store: Số lượng documents đã index.
*	Nút làm mới trạng thái.

**Hình 3.41**: Card trạng thái AI Services

### 3.12.3. Cấu hình STT Providers
a) Voice Form Provider
*	Radio buttons chọn provider:
-	Web Speech API.
-	Gemini 2.5 Flash.
*	Icon check cho provider đang active.

b) Meeting Transcription Provider
*	Radio buttons chọn provider:
-	VinAI PhoWhisper.
-	Gemini 2.5 Flash.
-	OpenAI Whisper.

**Hình 3.42**: Cấu hình STT Providers

### 3.12.4. Quản lý từ viết tắt
a) Bảng từ viết tắt
*	2 cột: Từ viết tắt | Từ đầy đủ.
*	Ví dụ: "BGH" → "Ban Giám hiệu".
*	Ví dụ: "CSVC" → "Cơ sở vật chất".

b) Thao tác
*	Nút "Thêm": Thêm từ mới.
*	Nút "Xóa": Xóa từ đã chọn.
*	Nút "Lưu": Lưu tất cả thay đổi.
*	Import/Export file JSON.

**Hình 3.43**: Quản lý từ viết tắt

### 3.12.5. Đồng bộ dữ liệu AI
a) Giao diện đồng bộ
*	Progress bar hiển thị tiến độ.
*	Thông tin: "Đã đồng bộ X/Y documents".
*	Nút "Đồng bộ tất cả".
*	Nút "Đồng bộ mới".

**Hình 3.44**: Đồng bộ dữ liệu AI

---

## 3.13. Giao diện Tin tức công khai

### 3.13.1. Trang danh sách tin tức
a) Header
*	Nền màu primary.
*	Icon Newspaper.
*	Tiêu đề: "Tin tức".
*	Mô tả: "Cập nhật tin tức mới nhất từ Trường Đại học Thái Bình".

b) Danh sách tin
*	Grid layout:
-	Desktop: 3 cột.
-	Tablet: 2 cột.
-	Mobile: 1 cột.
*	Mỗi card:
-	Hình ảnh 16:9.
-	Tiêu đề (2 dòng).
-	Tóm tắt (3 dòng).
-	Tác giả và ngày đăng.
-	Nút "Đọc thêm".

**Hình 3.45**: Trang danh sách tin tức

### 3.13.2. Trang chi tiết tin tức
a) Nội dung
*	Tiêu đề lớn.
*	Meta info: Tác giả, ngày đăng, số lượt xem.
*	Hình ảnh đại diện (full width).
*	Nội dung bài viết (rich text).
*	Các tin liên quan.

**Hình 3.46**: Trang chi tiết tin tức

---

## 3.14. Giao diện Thông báo công khai

### 3.14.1. Trang danh sách thông báo
a) Header
*	Nền màu primary.
*	Icon Bell.
*	Tiêu đề: "Thông báo".
*	Mô tả: "Các thông báo quan trọng từ nhà trường".

b) Danh sách thông báo
*	Hiển thị dạng list.
*	Badge ưu tiên ở đầu.
*	Tiêu đề và nội dung tóm tắt.
*	Ngày đăng.
*	Click để xem chi tiết.

**Hình 3.47**: Trang danh sách thông báo

### 3.14.2. Trang chi tiết thông báo
a) Nội dung
*	Badge ưu tiên.
*	Tiêu đề.
*	Ngày đăng.
*	Nội dung đầy đủ.
*	Nút quay lại danh sách.

**Hình 3.48**: Trang chi tiết thông báo

---

## 3.15. Giao diện trang Giới thiệu

### 3.15.1. Nội dung trang
a) Các phần chính
*	Giới thiệu về Trường Đại học Thái Bình.
*	Lịch sử hình thành và phát triển.
*	Tầm nhìn, sứ mệnh.
*	Các ngành đào tạo.
*	Thông tin liên hệ.

b) Thiết kế
*	Banner với hình ảnh trường.
*	Các section chia theo chủ đề.
*	Grid layout cho các thông tin key.
*	Bản đồ Google Maps nhúng.

**Hình 3.49**: Trang giới thiệu

---

## 3.16. Thiết kế Responsive

### 3.16.1. Desktop (≥1024px)
*	Sidebar cố định bên trái.
*	Nội dung mở rộng tối đa.
*	Grid nhiều cột.
*	Hiển thị đầy đủ các thành phần.

### 3.16.2. Tablet (768px - 1023px)
*	Sidebar ẩn, mở bằng hamburger menu.
*	Grid 2 cột.
*	Navigation thu gọn.
*	Font size và spacing điều chỉnh.

### 3.16.3. Mobile (<768px)
*	Sidebar hoàn toàn ẩn.
*	Grid 1 cột.
*	Navigation dạng hamburger.
*	Touch-friendly buttons.
*	Font size tối ưu cho màn hình nhỏ.

**Hình 3.50**: Giao diện responsive trên các thiết bị

---

## 3.17. Hệ thống thông báo (Notifications)

### 3.17.1. Toast Notifications
a) Các loại Toast
*	Success: Màu xanh lá, thao tác thành công.
*	Error: Màu đỏ, có lỗi xảy ra.
*	Warning: Màu vàng, cảnh báo.
*	Info: Màu xanh dương, thông tin.

b) Vị trí hiển thị
*	Góc dưới bên phải màn hình.
*	Tự động ẩn sau 3-5 giây.

### 3.17.2. Bell Notifications
a) Icon chuông trong Header
*	Hiển thị số thông báo chưa đọc (badge đỏ).
*	Click mở dropdown danh sách.

b) Dropdown thông báo
*	Nút "Đánh dấu đã đọc tất cả".
*	Danh sách thông báo gần đây.
*	Scroll để xem thông báo cũ.
*	Các loại:
-	Lịch công tác mới.
-	Thông báo mới.
-	Tin tức mới.

**Hình 3.51**: Hệ thống thông báo

---

## 3.18. Tổng kết chương

Chương III đã trình bày chi tiết thiết kế giao diện của Hệ thống Quản lý Lịch Công Tác Trường Đại học Thái Bình, bao gồm:

### 3.18.1. Giao diện công khai
*	Trang chủ với Hero section hiện đại.
*	Trang xem lịch công tác theo tuần/tháng.
*	Trợ lý AI Chatbot tra cứu lịch.
*	Trang tin tức và thông báo.
*	Trang giới thiệu.

### 3.18.2. Giao diện quản trị
*	Dashboard tổng quan.
*	Quản lý lịch công tác với Voice Guided Form.
*	Biên bản cuộc họp với ghi âm và AI.
*	Quản lý tin tức và thông báo.
*	Quản lý người dùng.
*	Cài đặt hệ thống.
*	Cấu hình AI.

### 3.18.3. Trải nghiệm người dùng
*	Thiết kế responsive cho mọi thiết bị.
*	Hệ thống thông báo realtime.
*	Nhập liệu bằng giọng nói.
*	Tông màu chủ đạo phù hợp bộ nhận diện TBU.

Giao diện được thiết kế theo phong cách hiện đại, tông màu chủ đạo xanh navy (primary) và vàng (accent), mang lại trải nghiệm sử dụng chuyên nghiệp và thân thiện.
