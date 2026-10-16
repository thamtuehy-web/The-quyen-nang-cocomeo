import json
from datetime import datetime, timedelta
from database import init_db, get_db_connection

def seed_sample_data():
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()

    # Làm sạch bảng cũ để cập nhật dữ liệu chuẩn có đầy đủ quả bóng và ô vuông combo
    cursor.execute("DELETE FROM card_logs")
    cursor.execute("DELETE FROM cards")

    now = datetime.now()
    now_str = now.strftime('%Y-%m-%d %H:%M:%S')

    # 1. Thẻ Quyền Năng Combo 1 (#0001):
    # - Quả bóng 1: Đã tích X, Ô vuông 1: Đã lấy quà (GẠCH CHÉO ĐỎ)
    # - Quả bóng 2: Đã tích X, Ô vuông 2: Khách chưa lấy (NGUYÊN VẸN ĐÁNH SỐ 2)
    # - Quả bóng 3..6: Trống, Ô vuông 3..6: Nguyên vẹn đánh số 3..6 để bấm trải nghiệm ngay!
    slots_card1 = [
        {"index": 1, "used": True, "used_at": (now - timedelta(days=2)).strftime('%Y-%m-%d 10:15:30'), "branch": "CS1 Hoà Xuân", "gift_taken": True, "gift_taken_at": (now - timedelta(days=2)).strftime('%Y-%m-%d 10:16:00')},
        {"index": 2, "used": True, "used_at": (now - timedelta(days=1)).strftime('%Y-%m-%d 16:45:12'), "branch": "CS2 Ngũ Hành Sơn", "gift_taken": False, "gift_taken_at": None},
        {"index": 3, "used": False, "used_at": None, "branch": None, "gift_taken": False, "gift_taken_at": None},
        {"index": 4, "used": False, "used_at": None, "branch": None, "gift_taken": False, "gift_taken_at": None},
        {"index": 5, "used": False, "used_at": None, "branch": None, "gift_taken": False, "gift_taken_at": None},
        {"index": 6, "used": False, "used_at": None, "branch": None, "gift_taken": False, "gift_taken_at": None}
    ]
    cursor.execute('''
        INSERT INTO cards (
            card_type, card_number, branch, child_name, parent_name, phone,
            created_at, expires_at, slots_json, status, created_branch, power_subtype
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, 'active', ?, ?)
    ''', ('power', 1, 'CS1 Hoà Xuân', 'Bé Bống (Gia Hân)', 'Mẹ Mai Phương', '0905123456', 
          (now - timedelta(days=3)).strftime('%Y-%m-%d 09:30:00'), json.dumps(slots_card1), 'CS1 Hoà Xuân', 'Combo 1'))
    card1_id = cursor.lastrowid

    cursor.execute('''
        INSERT INTO card_logs (card_id, action, slot_index, used_at, branch, note)
        VALUES (?, 'use_slot', 1, ?, 'CS1 Hoà Xuân', 'Sử dụng lượt 1'),
               (?, 'combo_gift', 1, ?, 'CS1 Hoà Xuân', 'Đã lấy 10 xu lượt 1'),
               (? , 'use_slot', 2, ?, 'CS2 Ngũ Hành Sơn', 'Sử dụng lượt 2')
    ''', (card1_id, (now - timedelta(days=2)).strftime('%Y-%m-%d 10:15:30'),
          card1_id, (now - timedelta(days=2)).strftime('%Y-%m-%d 10:16:00'),
          card1_id, (now - timedelta(days=1)).strftime('%Y-%m-%d 16:45:12')))

    # 2. Thẻ Quyền Năng Combo 2 (#0002):
    slots_card2 = [
        {"index": 1, "used": True, "used_at": (now - timedelta(days=1)).strftime('%Y-%m-%d 11:00:00'), "branch": "CS3 Phạm Hùng", "gift_taken": True, "gift_taken_at": (now - timedelta(days=1)).strftime('%Y-%m-%d 11:02:00')},
        {"index": 2, "used": False, "used_at": None, "branch": None, "gift_taken": False, "gift_taken_at": None},
        {"index": 3, "used": False, "used_at": None, "branch": None, "gift_taken": False, "gift_taken_at": None},
        {"index": 4, "used": False, "used_at": None, "branch": None, "gift_taken": False, "gift_taken_at": None},
        {"index": 5, "used": False, "used_at": None, "branch": None, "gift_taken": False, "gift_taken_at": None},
        {"index": 6, "used": False, "used_at": None, "branch": None, "gift_taken": False, "gift_taken_at": None}
    ]
    cursor.execute('''
        INSERT INTO cards (
            card_type, card_number, branch, child_name, parent_name, phone,
            created_at, expires_at, slots_json, status, created_branch, power_subtype
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, 'active', ?, ?)
    ''', ('power', 2, 'CS3 Phạm Hùng', 'Bé Tuấn Kiệt', 'Bố Minh Trí', '0935112233', 
          (now - timedelta(days=1)).strftime('%Y-%m-%d 10:45:00'), json.dumps(slots_card2), 'CS3 Phạm Hùng', 'Combo 2'))

    # 3. Thẻ Quyền Năng Vé Vui Chơi (#0003): ĐÃ HẾT 6 LƯỢT (gạch chéo mờ X cả thẻ)
    slots_card3 = [
        {"index": i+1, "used": True, "used_at": (now - timedelta(days=6-i)).strftime('%Y-%m-%d 14:00:00'), "branch": "CS1 Hoà Xuân", "gift_taken": False, "gift_taken_at": None}
        for i in range(6)
    ]
    cursor.execute('''
        INSERT INTO cards (
            card_type, card_number, branch, child_name, parent_name, phone,
            created_at, expires_at, slots_json, status, created_branch, power_subtype
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, 'completed', ?, ?)
    ''', ('power', 3, 'CS1 Hoà Xuân', 'Bé Bảo Nam', 'Bố Hoàng Long', '0912345678', 
          (now - timedelta(days=10)).strftime('%Y-%m-%d 15:20:00'), json.dumps(slots_card3), 'CS1 Hoà Xuân', 'Vé Vui Chơi'))

    # 4. Thẻ Siêu Quyền Năng (#0001): Còn hạn 27 ngày
    super_exp1 = (now + timedelta(days=27)).strftime('%Y-%m-%d %H:%M:%S')
    cursor.execute('''
        INSERT INTO cards (
            card_type, card_number, branch, child_name, parent_name, phone,
            created_at, expires_at, slots_json, status, created_branch, power_subtype
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 'active', ?, NULL)
    ''', ('super', 1, 'CS2 Ngũ Hành Sơn', 'Bé Sushi (Khánh An)', 'Mẹ Thùy Dương', '0988776655', 
          (now - timedelta(days=3)).strftime('%Y-%m-%d 17:00:00'), super_exp1, 'CS2 Ngũ Hành Sơn'))
    card4_id = cursor.lastrowid

    cursor.execute('''
        INSERT INTO card_logs (card_id, action, slot_index, used_at, branch, note)
        VALUES (?, 'super_checkin', NULL, ?, 'CS2 Ngũ Hành Sơn', 'Bé đến chơi check-in ngày 1')
    ''', (card4_id, (now - timedelta(days=2)).strftime('%Y-%m-%d 17:15:00')))

    # 5. Thẻ Siêu Quyền Năng (#0002): ĐÃ HẾT HẠN 30 NGÀY
    super_exp2 = (now - timedelta(days=2)).strftime('%Y-%m-%d %H:%M:%S')
    cursor.execute('''
        INSERT INTO cards (
            card_type, card_number, branch, child_name, parent_name, phone,
            created_at, expires_at, slots_json, status, created_branch, power_subtype
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 'expired', ?, NULL)
    ''', ('super', 2, 'CS3 Phạm Hùng', 'Bé Sóc (Minh Triết)', 'Mẹ Kim Oanh', '0933221100', 
          (now - timedelta(days=32)).strftime('%Y-%m-%d 11:00:00'), super_exp2, 'CS3 Phạm Hùng'))

    conn.commit()
    conn.close()
    print("Da cap nhat thanh cong du lieu mau the combo voi qua bong va o vuong!")

if __name__ == '__main__':
    seed_sample_data()
