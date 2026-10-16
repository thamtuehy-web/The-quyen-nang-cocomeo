import sqlite3
import json
import os
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cocomeo.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Bảng thẻ (Thẻ Quyền Năng & Thẻ Siêu Quyền Năng)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        card_type TEXT NOT NULL, -- 'power' (Quyền Năng) hoặc 'super' (Siêu Quyền Năng)
        card_number INTEGER NOT NULL, -- 1-9999
        branch TEXT NOT NULL, -- CS1 Hoà Xuân, CS2 Ngũ Hành Sơn, CS3 Phạm Hùng
        child_name TEXT NOT NULL,
        parent_name TEXT NOT NULL,
        phone TEXT DEFAULT '',
        created_at TEXT NOT NULL, -- Thời gian thực mở thẻ: YYYY-MM-DD HH:MM:SS
        expires_at TEXT, -- Thời gian hết hạn (sau 30 ngày cho Thẻ Siêu Quyền Năng)
        slots_json TEXT, -- JSON lưu trạng thái 6 ô cho Thẻ Quyền Năng
        status TEXT DEFAULT 'active', -- 'active', 'completed', 'expired'
        created_branch TEXT, -- Chi nhánh tạo thẻ
        power_subtype TEXT DEFAULT 'Vé Vui Chơi' -- 'Vé Vui Chơi', 'Combo 1', 'Combo 2'
    )
    ''')

    # Tự động cập nhật thêm cột power_subtype nếu cơ sở dữ liệu cũ chưa có
    cursor.execute("PRAGMA table_info(cards)")
    columns = [col[1] for col in cursor.fetchall()]
    if 'power_subtype' not in columns:
        cursor.execute("ALTER TABLE cards ADD COLUMN power_subtype TEXT DEFAULT 'Vé Vui Chơi'")

    # Bảng lịch sử sử dụng lượt / check-in
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS card_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        card_id INTEGER NOT NULL,
        action TEXT NOT NULL, -- 'use_slot', 'combo_gift' hoặc 'super_checkin'
        slot_index INTEGER, -- 1 đến 6 (đối với thẻ quyền năng)
        used_at TEXT NOT NULL, -- Thời gian xác nhận sử dụng
        branch TEXT NOT NULL,
        note TEXT DEFAULT '',
        FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
    )
    ''')

    # Bảng tài khoản đăng nhập hệ thống (Bảo mật thông tin CocoMeo)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS app_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT NOT NULL,
        reset_otp TEXT,
        reset_otp_expiry TEXT
    )
    ''')

    # Khởi tạo hoặc cập nhật tài khoản mặc định: cocomeo / Meo1234* / thamtuehy@gmail.com
    cursor.execute("SELECT id, password FROM app_users WHERE username = 'cocomeo'")
    user_row = cursor.fetchone()
    if not user_row:
        cursor.execute('''
            INSERT INTO app_users (username, password, email)
            VALUES ('cocomeo', 'Meo1234*', 'thamtuehy@gmail.com')
        ''')
    else:
        # Đảm bảo email luôn chuẩn thamtuehy@gmail.com
        cursor.execute("UPDATE app_users SET email = 'thamtuehy@gmail.com' WHERE username = 'cocomeo'")

    conn.commit()
    conn.close()

def verify_user_credentials(username, password):
    """Xác thực đăng nhập tài khoản hệ thống"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, password, email FROM app_users WHERE username = ?", (username,))
    row = cursor.fetchone()
    conn.close()

    if row and row['password'] == password:
        return True, dict(row)
    return False, None

def create_password_reset_otp(email):
    """Tạo mã OTP 6 số để khôi phục mật khẩu gửi tới email"""
    import random
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username FROM app_users WHERE email = ?", (email,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None, None, "Email không tồn tại trong hệ thống tài khoản!"

    otp = f"{random.randint(100000, 999999)}"
    expiry = (datetime.now() + timedelta(minutes=15)).strftime('%Y-%m-%d %H:%M:%S')

    cursor.execute('''
        UPDATE app_users 
        SET reset_otp = ?, reset_otp_expiry = ? 
        WHERE id = ?
    ''', (otp, expiry, row['id']))
    conn.commit()
    conn.close()

    return otp, expiry, None

def verify_and_reset_password(email, otp, new_password):
    """Kiểm tra mã OTP và cập nhật mật khẩu mới"""
    if not new_password or len(new_password) < 4:
        return False, "Mật khẩu mới phải có ít nhất 4 ký tự!"

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, reset_otp, reset_otp_expiry FROM app_users WHERE email = ?", (email,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return False, "Không tìm thấy tài khoản với email này!"

    if not row['reset_otp'] or row['reset_otp'].strip() != otp.strip():
        conn.close()
        return False, "Mã xác nhận OTP không chính xác!"

    now = datetime.now()
    if row['reset_otp_expiry']:
        expiry_dt = datetime.strptime(row['reset_otp_expiry'], '%Y-%m-%d %H:%M:%S')
        if now > expiry_dt:
            conn.close()
            return False, "Mã xác nhận OTP đã hết hạn (chỉ có hiệu lực trong 15 phút)!"

    # Cập nhật mật khẩu mới và xóa mã OTP đã dùng
    cursor.execute('''
        UPDATE app_users 
        SET password = ?, reset_otp = NULL, reset_otp_expiry = NULL 
        WHERE id = ?
    ''', (new_password, row['id']))
    conn.commit()
    conn.close()

    return True, "Cập nhật mật khẩu mới thành công! Bạn có thể đăng nhập ngay."


def get_next_card_number(card_type):
    """Tính số thứ tự thẻ tiếp theo từ 1 đến 9999 cho từng loại thẻ"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT MAX(card_number) FROM cards WHERE card_type = ?', (card_type,))
    row = cursor.fetchone()
    conn.close()
    
    max_num = row[0] if row and row[0] is not None else 0
    next_num = max_num + 1
    if next_num > 9999:
        next_num = 1 # quay lại vòng mới nếu vượt quá 9999
    return next_num

def check_and_update_expiry(card):
    """Kiểm tra xem thẻ siêu quyền năng đã quá 30 ngày hay chưa"""
    if card['card_type'] == 'super' and card['expires_at']:
        try:
            exp_date = datetime.strptime(card['expires_at'], '%Y-%m-%d %H:%M:%S')
            if datetime.now() > exp_date and card['status'] == 'active':
                conn = get_db_connection()
                conn.execute('UPDATE cards SET status = ? WHERE id = ?', ('expired', card['id']))
                conn.commit()
                conn.close()
                card['status'] = 'expired'
        except Exception as e:
            pass
    return card
