from flask import Flask, render_template, request, jsonify, send_from_directory, send_file
import json
import os
from datetime import datetime, timedelta
from database import init_db, get_db_connection, get_next_card_number, check_and_update_expiry

app = Flask(__name__)
app.config['SECRET_KEY'] = 'cocomeo-power-card-secret-key-2026'
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')

# Cấu hình tài khoản Quản trị viên (Chỉ dùng khi cần xóa dữ liệu thẻ)
ADMIN_USERNAME = 'cocomeo'
ADMIN_PASSWORD = '12121990'

# Khởi tạo CSDL
init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/system-time', methods=['GET'])
def get_system_time():
    """Trả về thời gian thực tế của máy tính"""
    now = datetime.now()
    return jsonify({
        'raw': now.strftime('%Y-%m-%d %H:%M:%S'),
        'date_display': now.strftime('%d/%m/%Y'),
        'time_display': now.strftime('%H:%M:%S'),
        'full_display': now.strftime('%d/%m/%Y %H:%M:%S')
    })

@app.route('/api/next-number/<card_type>', methods=['GET'])
def next_number(card_type):
    """Lấy số thứ tự thẻ tiếp theo (1-9999)"""
    if card_type not in ['power', 'super']:
        return jsonify({'error': 'Loại thẻ không hợp lệ'}), 400
    
    number = get_next_card_number(card_type)
    return jsonify({
        'next_number': number,
        'formatted': f"{number:04d}"
    })

@app.route('/api/cards', methods=['GET'])
def list_cards():
    """Lấy danh sách thẻ có hỗ trợ tìm kiếm và lọc"""
    card_type = request.args.get('type')
    branch = request.args.get('branch')
    search = request.args.get('search', '').strip()
    status = request.args.get('status')

    conn = get_db_connection()
    query = "SELECT * FROM cards WHERE 1=1"
    params = []

    if card_type:
        query += " AND card_type = ?"
        params.append(card_type)
    
    if branch and branch != 'all':
        query += " AND branch = ?"
        params.append(branch)

    if status and status != 'all':
        query += " AND status = ?"
        params.append(status)

    if search:
        query += " AND (child_name LIKE ? OR parent_name LIKE ? OR card_number LIKE ? OR phone LIKE ?)"
        wildcard = f"%{search}%"
        params.extend([wildcard, wildcard, wildcard, wildcard])

    query += " ORDER BY id DESC"

    cursor = conn.cursor()
    cursor.execute(query, params)
    rows = cursor.fetchall()

    cards = []
    now = datetime.now()
    for row in rows:
        c = dict(row)
        if c.get('slots_json'):
            try:
                c['slots'] = json.loads(c['slots_json'])
            except Exception:
                c['slots'] = []
        else:
            c['slots'] = []

        # Tự động cập nhật nếu thẻ siêu quyền năng quá hạn 30 ngày
        if c['card_type'] == 'super' and c['expires_at']:
            try:
                exp_date = datetime.strptime(c['expires_at'], '%Y-%m-%d %H:%M:%S')
                if now > exp_date and c['status'] == 'active':
                    c['status'] = 'expired'
                    conn.execute('UPDATE cards SET status = ? WHERE id = ?', ('expired', c['id']))
            except Exception:
                pass

        cards.append(c)

    conn.commit()
    conn.close()
    return jsonify(cards)

@app.route('/api/cards', methods=['POST'])
def create_card():
    """Tạo mới Thẻ Quyền Năng hoặc Thẻ Siêu Quyền Năng"""
    data = request.json or {}
    card_type = data.get('card_type') # 'power' hoặc 'super'
    branch = data.get('branch') # 'CS1 Hoà Xuân', 'CS2 Ngũ Hành Sơn', 'CS3 Phạm Hùng'
    child_name = data.get('child_name', '').strip()
    parent_name = data.get('parent_name', '').strip()
    phone = data.get('phone', '').strip()
    power_subtype = data.get('power_subtype', 'Vé Vui Chơi').strip() if card_type == 'power' else None

    if not card_type or card_type not in ['power', 'super']:
        return jsonify({'error': 'Loại thẻ không hợp lệ'}), 400
    if not branch:
        return jsonify({'error': 'Vui lòng chọn chi nhánh'}), 400
    if not child_name:
        return jsonify({'error': 'Vui lòng nhập tên bé'}), 400
    if not parent_name:
        return jsonify({'error': 'Vui lòng nhập tên phụ huynh'}), 400

    # Lấy thời gian thực trên máy tính
    now = datetime.now()
    created_at_str = now.strftime('%Y-%m-%d %H:%M:%S')

    card_number = get_next_card_number(card_type)
    expires_at_str = None
    slots_json = None

    if card_type == 'power':
        # Thẻ Quyền Năng: Tạo sẵn 6 ô tròn (và ô vuông quà tặng nếu là combo)
        slots = [
            {
                'index': i + 1,
                'used': False,
                'used_at': None,
                'branch': None,
                'gift_taken': False,
                'gift_taken_at': None
            }
            for i in range(6)
        ]
        slots_json = json.dumps(slots)
    elif card_type == 'super':
        # Thẻ Siêu Quyền Năng: Hết hạn sau đúng 30 ngày
        expires_date = now + timedelta(days=30)
        expires_at_str = expires_date.strftime('%Y-%m-%d %H:%M:%S')

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO cards (
            card_type, card_number, branch, child_name, parent_name,
            phone, created_at, expires_at, slots_json, status, created_branch, power_subtype
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    ''', (card_type, card_number, branch, child_name, parent_name, phone, created_at_str, expires_at_str, slots_json, branch, power_subtype))

    card_id = cursor.lastrowid
    conn.commit()

    # Lấy lại thẻ vừa tạo
    cursor.execute('SELECT * FROM cards WHERE id = ?', (card_id,))
    new_card = dict(cursor.fetchone())
    conn.close()

    if new_card.get('slots_json'):
        new_card['slots'] = json.loads(new_card['slots_json'])

    return jsonify({
        'message': 'Mở thẻ thành công!',
        'card': new_card
    }), 201

@app.route('/api/cards/<int:card_id>', methods=['GET'])
def get_card(card_id):
    """Lấy chi tiết một thẻ cụ thể kèm lịch sử"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM cards WHERE id = ?', (card_id,))
    row = cursor.fetchone()

    if not row:
        conn.close()
        return jsonify({'error': 'Không tìm thấy thẻ'}), 404

    card = dict(row)
    if card.get('slots_json'):
        card['slots'] = json.loads(card['slots_json'])
    else:
        card['slots'] = []

    # Kiểm tra hạn 30 ngày
    now = datetime.now()
    if card['card_type'] == 'super' and card['expires_at']:
        try:
            exp_date = datetime.strptime(card['expires_at'], '%Y-%m-%d %H:%M:%S')
            if now > exp_date and card['status'] == 'active':
                card['status'] = 'expired'
                conn.execute('UPDATE cards SET status = ? WHERE id = ?', ('expired', card['id']))
                conn.commit()
        except Exception:
            pass

    # Lấy lịch sử sử dụng
    cursor.execute('SELECT * FROM card_logs WHERE card_id = ? ORDER BY id DESC', (card_id,))
    logs = [dict(log) for log in cursor.fetchall()]
    card['logs'] = logs

    conn.close()
    return jsonify(card)

@app.route('/api/cards/<int:card_id>/use-slot', methods=['POST'])
def use_slot(card_id):
    """
    Xác nhận sử dụng 1 ô tròn trong Thẻ Quyền Năng.
    Ghi nhận ngày giờ thực tế từ đồng hồ máy tính, đánh dấu X cho ô đó.
    Nếu đủ 6 ô -> Đổi trạng thái sang 'completed' (Đã hết lượt sử dụng)
    """
    data = request.json or {}
    slot_index = data.get('slot_index') # 1-6
    branch = data.get('branch', 'CS1 Hoà Xuân')
    note = data.get('note', '')

    if slot_index is None or not (1 <= int(slot_index) <= 6):
        return jsonify({'error': 'Số ô không hợp lệ (1-6)'}), 400

    slot_index = int(slot_index)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM cards WHERE id = ?', (card_id,))
    row = cursor.fetchone()

    if not row:
        conn.close()
        return jsonify({'error': 'Không tìm thấy thẻ'}), 404

    card = dict(row)
    if card['card_type'] != 'power':
        conn.close()
        return jsonify({'error': 'Chỉ Thẻ Quyền Năng mới có 6 ô sử dụng lượt'}), 400

    slots = json.loads(card['slots_json']) if card.get('slots_json') else []
    
    # Kiểm tra ô này đã tích X chưa
    target_slot = None
    for s in slots:
        if s['index'] == slot_index:
            target_slot = s
            break

    if not target_slot:
        conn.close()
        return jsonify({'error': 'Không tìm thấy ô chỉ định'}), 400

    if target_slot.get('used'):
        conn.close()
        return jsonify({'error': f'Ô số {slot_index} đã được sử dụng trước đó'}), 400

    # Lấy thời gian thực máy tính
    now = datetime.now()
    used_at_str = now.strftime('%Y-%m-%d %H:%M:%S')

    target_slot['used'] = True
    target_slot['used_at'] = used_at_str
    target_slot['branch'] = branch

    # Kiểm tra xem đã tích hết cả 6 ô chưa
    all_used = all(s.get('used') for s in slots)
    new_status = 'completed' if all_used else 'active'

    # Cập nhật CSDL
    cursor.execute('''
        UPDATE cards SET slots_json = ?, status = ? WHERE id = ?
    ''', (json.dumps(slots), new_status, card_id))

    # Ghi log lịch sử
    cursor.execute('''
        INSERT INTO card_logs (card_id, action, slot_index, used_at, branch, note)
        VALUES (?, 'use_slot', ?, ?, ?, ?)
    ''', (card_id, slot_index, used_at_str, branch, note))

    conn.commit()

    card['slots'] = slots
    card['status'] = new_status
    card['all_used'] = all_used
    card['used_at_slot'] = used_at_str

    is_combo = card.get('power_subtype') in ['Combo 1', 'Combo 2']
    power_subtype = card.get('power_subtype', 'Vé Vui Chơi')

    conn.close()
    return jsonify({
        'message': f'Đã xác nhận sử dụng lượt {slot_index} thành công!',
        'card': card,
        'all_used': all_used,
        'is_combo': is_combo,
        'power_subtype': power_subtype,
        'slot_index': slot_index
    })

@app.route('/api/cards/<int:card_id>/toggle-gift', methods=['POST'])
def toggle_gift(card_id):
    """
    Xác nhận khách đã lấy (hoặc chưa lấy) quà combo cho ô lượt slot_index.
    Nếu đã lấy -> gạch chéo ô vuông nhỏ bên dưới ô bóng.
    """
    data = request.get_json(silent=True) or {}
    slot_index = int(data.get('slot_index', 1))
    gift_taken = bool(data.get('gift_taken', True))
    branch = data.get('branch', 'CS1 Hoà Xuân')

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM cards WHERE id = ?', (card_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({'error': 'Không tìm thấy thẻ'}), 404

    card = dict(row)
    slots = json.loads(card['slots_json']) if card.get('slots_json') else []
    target_slot = next((s for s in slots if s.get('index') == slot_index), None)
    if not target_slot:
        conn.close()
        return jsonify({'error': 'Không tìm thấy ô chỉ định'}), 400

    now = datetime.now()
    now_str = now.strftime('%Y-%m-%d %H:%M:%S')

    target_slot['gift_taken'] = gift_taken
    target_slot['gift_taken_at'] = now_str if gift_taken else None
    target_slot['gift_branch'] = branch if gift_taken else None

    cursor.execute('UPDATE cards SET slots_json = ? WHERE id = ?', (json.dumps(slots), card_id))

    if gift_taken:
        cursor.execute('''
            INSERT INTO card_logs (card_id, action, slot_index, used_at, branch, note)
            VALUES (?, 'combo_gift', ?, ?, ?, ?)
        ''', (card_id, slot_index, now_str, branch, f"Đã lấy quà: 10 xu/ Nước + Bim Bim (Lượt {slot_index})"))

    conn.commit()

    card['slots'] = slots
    conn.close()

    return jsonify({
        'message': f"Đã cập nhật trạng thái quà lượt {slot_index} thành công!",
        'card': card,
        'slot_index': slot_index,
        'gift_taken': gift_taken
    })

@app.route('/api/cards/<int:card_id>/checkin-super', methods=['POST'])
def checkin_super(card_id):
    """Ghi nhận lượt check-in hàng ngày cho Thẻ Siêu Quyền Năng"""
    data = request.json or {}
    branch = data.get('branch', 'CS1 Hoà Xuân')
    note = data.get('note', 'Check-in vui chơi trong ngày')

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM cards WHERE id = ?', (card_id,))
    row = cursor.fetchone()

    if not row:
        conn.close()
        return jsonify({'error': 'Không tìm thấy thẻ'}), 404

    card = dict(row)
    if card['card_type'] != 'super':
        conn.close()
        return jsonify({'error': 'Chỉ Thẻ Siêu Quyền Năng mới dùng tính năng này'}), 400

    now = datetime.now()
    exp_date = datetime.strptime(card['expires_at'], '%Y-%m-%d %H:%M:%S')
    if now > exp_date:
        cursor.execute('UPDATE cards SET status = ? WHERE id = ?', ('expired', card_id))
        conn.commit()
        conn.close()
        return jsonify({'error': 'Thẻ này đã hết hạn 30 ngày!'}), 400

    now_str = now.strftime('%Y-%m-%d %H:%M:%S')
    cursor.execute('''
        INSERT INTO card_logs (card_id, action, slot_index, used_at, branch, note)
        VALUES (?, 'super_checkin', NULL, ?, ?, ?)
    ''', (card_id, now_str, branch, note))

    conn.commit()
    conn.close()

    return jsonify({
        'message': f'Đã check-in thành công cho bé {card["child_name"]}!',
        'used_at': now_str
    })

@app.route('/api/cards/<int:card_id>/toggle-expire-demo', methods=['POST'])
def toggle_expire_demo(card_id):
    """Hỗ trợ thử nghiệm demo trạng thái hết hạn / còn hạn cho Thẻ Siêu Quyền Năng"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM cards WHERE id = ?', (card_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({'error': 'Không tìm thấy thẻ'}), 404

    card = dict(row)
    new_status = 'expired' if card['status'] != 'expired' else 'active'
    cursor.execute('UPDATE cards SET status = ? WHERE id = ?', (new_status, card_id))
    conn.commit()
    conn.close()

    return jsonify({
        'message': f'Đã chuyển trạng thái demo sang: {new_status}',
        'status': new_status
    })

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Thống kê tổng quan cho quản lý và nhân viên 3 chi nhánh"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM cards WHERE card_type = 'power'")
    total_power = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM cards WHERE card_type = 'super'")
    total_super = cursor.fetchone()[0]

    cursor.execute("SELECT branch, COUNT(*) FROM cards GROUP BY branch")
    by_branch = {row[0]: row[1] for row in cursor.fetchall()}

    cursor.execute("SELECT COUNT(*) FROM card_logs WHERE DATE(used_at) = DATE('now', 'localtime')")
    today_checkins = cursor.fetchone()[0]

    conn.close()
    return jsonify({
        'total_power': total_power,
        'total_super': total_super,
        'total_cards': total_power + total_super,
        'by_branch': by_branch,
        'today_checkins': today_checkins
    })

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    """Xác thực đăng nhập admin khi muốn xóa dữ liệu thẻ"""
    data = request.json or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        return jsonify({
            'success': True,
            'message': 'Đăng nhập Admin thành công!',
            'token': 'cocomeo-admin-authorized-session'
        })
    else:
        return jsonify({
            'success': False,
            'error': 'Tên đăng nhập hoặc mật khẩu không chính xác!'
        }), 401

@app.route('/api/cards/<int:card_id>', methods=['DELETE'])
def delete_card(card_id):
    """Xóa 1 thẻ khỏi hệ thống (Chỉ dành cho Admin đã đăng nhập)"""
    auth_token = request.headers.get('X-Admin-Token')
    data = request.get_json(silent=True) or {}
    username = data.get('admin_username')
    password = data.get('admin_password')

    is_authorized = (
        auth_token == 'cocomeo-admin-authorized-session' or
        (username == ADMIN_USERNAME and password == ADMIN_PASSWORD)
    )

    if not is_authorized:
        return jsonify({'error': 'Yêu cầu quyền Admin để xóa dữ liệu thẻ!'}), 403

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id, card_number, child_name FROM cards WHERE id = ?', (card_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({'error': 'Thẻ không tồn tại trên hệ thống'}), 404

    card_info = dict(row)
    cursor.execute('DELETE FROM card_logs WHERE card_id = ?', (card_id,))
    cursor.execute('DELETE FROM cards WHERE id = ?', (card_id,))
    conn.commit()
    conn.close()

    return jsonify({
        'message': f"Đã xóa vĩnh viễn thẻ #{card_info['card_number']:04d} của bé {card_info['child_name']}!",
        'deleted_id': card_id
    })

@app.route('/api/cards/reset-all', methods=['POST'])
def reset_all_cards():
    """Xóa toàn bộ dữ liệu thẻ (Chỉ dành cho Admin)"""
    data = request.get_json(silent=True) or {}
    auth_token = request.headers.get('X-Admin-Token')
    username = data.get('admin_username')
    password = data.get('admin_password')

    is_authorized = (
        auth_token == 'cocomeo-admin-authorized-session' or
        (username == ADMIN_USERNAME and password == ADMIN_PASSWORD)
    )

    if not is_authorized:
        return jsonify({'error': 'Yêu cầu quyền Admin để xóa dữ liệu!'}), 403

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM card_logs')
    cursor.execute('DELETE FROM cards')
    cursor.execute("DELETE FROM sqlite_sequence WHERE name='cards' OR name='card_logs'")
    conn.commit()
    conn.close()

    return jsonify({'message': 'Đã làm mới sạch toàn bộ dữ liệu thẻ trên hệ thống!'})

@app.route('/api/backup/download-db', methods=['GET'])
def download_db():
    """Tải trực tiếp file cơ sở dữ liệu cocomeo.db để sao lưu"""
    db_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cocomeo.db')
    if os.path.exists(db_file):
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        return send_file(db_file, as_attachment=True, download_name=f'cocomeo_backup_{timestamp}.db')
    return jsonify({'error': 'File CSDL không tồn tại'}), 404

if __name__ == '__main__':
    # Chạy trên tất cả IP (0.0.0.0) để các máy trong mạng LAN hoặc khi đẩy lên cloud đều truy cập được
    port = int(os.environ.get('PORT', 5000))
    print(f"================================================================")
    print(f" CocoMeo Card Management System is running on http://127.0.0.1:{port}")
    print(f"================================================================")
    app.run(host='0.0.0.0', port=port, debug=True)
