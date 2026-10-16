# HỆ THỐNG THẺ QUYỀN NĂNG & SIÊU QUYỀN NĂNG COCOMEO
> Ứng dụng quản lý phát hành thẻ, tích lượt và tra cứu liên chi nhánh CocoMeo (CS1 Hoà Xuân, CS2 Ngũ Hành Sơn, CS3 Phạm Hùng).

---

## 🌟 TÍNH NĂNG NỔI BẬT

### 1. Giao Diện & Thương Hiệu CocoMeo
- **Logo CocoMeo** được đặt trang trọng ở chính giữa giao diện.
- **2 nút bấm riêng biệt TO, RÕ RÀNG**:
  - `THẺ QUYỀN NĂNG`: Nút cam vàng năng lượng, thẻ 6 ô tròn tích lượt.
  - `THẺ SIÊU QUYỀN NĂNG`: Nút tím hoàng gia VIP, thẻ 30 ngày vui chơi thỏa thích.
- **Đồng hồ thời gian thực (Real-time Clock)**: Đồng bộ với giờ máy tính thực tế, cập nhật từng giây.
- **Bộ chọn 3 chi nhánh**: CS1 Hoà Xuân, CS2 Ngũ Hành Sơn, CS3 Phạm Hùng (tự động ghi nhớ cho từng máy nhân viên).

---

### 2. THẺ QUYỀN NĂNG (Power Card)
- **Thiết kế**: Thẻ hình chữ nhật chuẩn thẻ VIP, viền ánh kim cam vàng.
- **Số thứ tự thẻ**: Tự động nhảy theo thứ tự mở thẻ từ **1-9999** (định dạng `#0001`, `#0002`...).
- **Chi nhánh**: Cho phép nhân viên chọn 1 trong 3 cơ sở.
- **Ngày mở thẻ**: Lấy chính xác ngày giờ thời gian thực trên máy tính (`DD/MM/YYYY HH:mm:ss`).
- **Tên bé & Tên Phụ Huynh**: Nhập liệu dễ dàng, có thêm trường SĐT Zalo.
- **6 Ô TRÒN TÍCH LƯỢT**:
  - Dưới thẻ bố trí 6 ô tròn để trống (đánh số 1 đến 6).
  - Khi nhân viên click vào bất kỳ ô tròn trống nào:
    - Bật popup hiển thị **THỜI GIAN THỰC ĐỒNG HỒ MÁY TÍNH** lúc đó (Giờ : Phút : Giây).
    - Có nút **"Xác Nhận"** to, rõ ràng.
    - Sau khi bấm "Xác Nhận", ô tròn đó chuyển thành dấu **X** đỏ (đã sử dụng lượt).
    - Lưu vết thời gian và chi nhánh xác nhận vào nhật ký.
  - **Sau khi tích X cả 6 ô**:
    - Tự động xuất hiện **dấu X mờ gạch chéo cả thẻ** cùng con dấu đỏ: **"THẺ ĐÃ HẾT LƯỢT SỬ DỤNG"**.

---

### 3. THẺ SIÊU QUYỀN NĂNG (Super Power Card)
- **Thiết kế**: Thẻ hình chữ nhật phong cách Cosmic Purple VIP.
- **Số thứ tự thẻ**: Tự động nhảy theo thứ tự mở thẻ từ **1-9999**.
- **Chi nhánh**: 3 chi nhánh lựa chọn.
- **Ngày mở thẻ**: Lấy thời gian thực trên máy tính.
- **Ngày hết thẻ**: Tự động tính chính xác **sau 30 ngày** kể từ ngày mở thẻ.
- **Tên bé & Tên Phụ Huynh**: Đầy đủ thông tin định danh.
- **Sau khi hết 30 ngày**:
  - Thẻ tự động gạch ngang dấu **X mờ** và hiện dòng chữ: **"THẺ ĐÃ HẾT HẠN SỬ DỤNG"**.
- **Tính năng mở rộng**:
  - Có nút **"Check-in Bé Đến Chơi"** để nhân viên 3 chi nhánh điểm danh khi bé vào cổng.
  - Có nút **"Thử nghiệm demo hết hạn"** để chủ quán/nhân viên test ngay hiệu ứng gạch mờ mà không cần đợi 30 ngày.

---

### 4. Quản Lý & Tra Cứu Cho 3 Chi Nhánh
- Tìm kiếm tức thì theo: Tên bé, Tên Phụ Huynh, Số thẻ (#0001...), Số điện thoại.
- Lọc theo Chi nhánh, Loại thẻ, Trạng thái (Đang hoạt động / Đã hết lượt / Đã hết hạn).
- Hỗ trợ **In thẻ** trực tiếp ra máy in để trao cho phụ huynh hoặc gửi Zalo.

---

### 5. Phân Quyền & Bảo Mật Xóa Dữ Liệu (Admin)
- **Nhân viên thông thường**: Vào app sử dụng tự do, **không cần đăng nhập** (mở thẻ, tích ô tròn, điểm danh bé, tra cứu...).
- **Xóa dữ liệu thẻ**: Chỉ khi bấm nút **"Xóa Thẻ"** (biểu tượng thùng rác), hệ thống mới yêu cầu đăng nhập tài khoản Quản trị viên:
  - **Tên đăng nhập**: `cocomeo`
  - **Mật khẩu**: `12121990`
- Khi đã đăng nhập, Quản trị viên có thể xóa bất kỳ thẻ nào và có nút **"Đăng xuất"** trên thanh trên cùng để khóa lại quyền nhân viên.

---

## 🚀 HƯỚNG DẪN CHẠY THỬ NGHIỆM TRÊN MÁY TÍNH

Thư mục dự án: `C:\Users\Admin\.gemini\antigravity\scratch\cocomeo_card_system`

### Cách 1: Chạy bằng 1 cú nhấp chuột (Khuyên dùng)
- Vào thư mục dự án và nhấp đúp vào file:
  👉 **`run_app.bat`**
- Hệ thống sẽ tự động khởi động server và mở trình duyệt web tại: `http://127.0.0.1:5000`

### Cách 2: Chạy qua dòng lệnh Terminal / PowerShell
```powershell
cd C:\Users\Admin\.gemini\antigravity\scratch\cocomeo_card_system
python app.py
```
Mở trình duyệt bất kỳ (Chrome, Cốc Cốc, Edge) và truy cập:
👉 `http://127.0.0.1:5000`

---

## 🌐 HƯỚNG DẪN ĐƯA LÊN CLOUD CHO 3 CHI NHÁNH DÙNG CHUNG

Để nhân viên tại **CS1 Hoà Xuân**, **CS2 Ngũ Hành Sơn** và **CS3 Phạm Hùng** có thể cùng truy cập thoại/máy tính bảng/máy POS thông qua một đường link web (VD: `https://cocomeo.onrender.com`):

### Cách 1: Đưa lên Render.com (Miễn phí 100%, cực dễ)
1. Đăng ký tài khoản miễn phí tại [https://render.com](https://render.com).
2. Tải toàn bộ thư mục `cocomeo_card_system` lên GitHub (hoặc kéo thả).
3. Tại Dashboard của Render, bấm **New +** -> Chọn **Web Service**.
4. Chọn repository GitHub vừa tạo:
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
5. Bấm **Create Web Service**. Sau 2-3 phút, Render sẽ cấp cho bạn một đường link HTTPS bảo mật vĩnh viễn (ví dụ `https://cocomeo-cards.onrender.com`).
6. Bạn chỉ cần gửi link này cho nhân viên 3 chi nhánh là có thể truy cập và ghi thông tin đồng thời!

### Cách 2: Chạy qua mạng nội bộ quán (Dành cho máy POS/PC tại quầy)
- Khi chạy `python app.py`, server đã mở trên IP `0.0.0.0`.
- Các máy tính bảng, điện thoại nhân viên kết nối chung Wi-Fi quán chỉ cần mở trình duyệt và gõ:
  `http://<IP_MAY_CHU>:5000` (Ví dụ: `http://192.168.1.15:5000`).

---

## 📂 CẤU TRÚC THƯ MỤC DỰ ÁN
```
cocomeo_card_system/
├── app.py                # Server Flask chính, các API tạo thẻ, tích ô, đếm số 1-9999
├── database.py           # Quản lý cơ sở dữ liệu SQLite & bảng thẻ
├── seed.py               # Dữ liệu mẫu ban đầu (để trải nghiệm ngay)
├── requirements.txt      # Thư viện Python cần thiết (Flask, Gunicorn)
├── Procfile              # Cấu hình triển khai Cloud (Render, Railway)
├── run_app.bat           # Phím tắt chạy nhanh trên Windows
├── cocomeo.db            # File cơ sở dữ liệu SQLite
├── templates/
│   └── index.html        # Giao diện chính responsive, 2 nút to, 2 thẻ chữ nhật
└── static/
    ├── logo.svg          # Logo CocoMeo độc quyền đáng yêu
    ├── style.css         # Hiệu ứng thẻ VIP, 6 ô tròn, con dấu gạch mờ X
    └── script.js         # Xử lý đồng hồ thực, click tích X, popup xác nhận
```
