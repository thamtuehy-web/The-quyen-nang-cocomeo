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

    conn.commit()
    conn.close()

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
