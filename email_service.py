import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_password_reset_email(to_email, otp_code, username='cocomeo'):
    """
    Gửi email chứa mã xác nhận OTP để khôi phục/tạo mật khẩu mới.
    Hỗ trợ gửi qua SMTP (Gmail, SendGrid, Mailgun hoặc SMTP server bất kỳ).
    Nếu chưa cấu hình mật khẩu SMTP (SMTP_PASS), hàm sẽ ghi log an toàn.
    """
    smtp_host = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
    smtp_port = int(os.environ.get('SMTP_PORT', 587))
    smtp_user = os.environ.get('SMTP_USER', '')
    smtp_pass = os.environ.get('SMTP_PASS', '')
    sender_name = os.environ.get('SMTP_SENDER_NAME', 'Hệ Thống Thẻ CocoMeo')
    sender_email = smtp_user if smtp_user else 'thamtuehy@gmail.com'

    subject = f"[CocoMeo] Mã xác nhận tạo mật khẩu mới: {otp_code}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FFF7ED; padding: 20px; }}
            .container {{ max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 18px; padding: 32px; border: 1px solid #FED7AA; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }}
            .header {{ text-align: center; margin-bottom: 24px; }}
            .logo-text {{ font-size: 26px; font-weight: 900; color: #EA580C; letter-spacing: -0.5px; }}
            .otp-box {{ background: #FEF3C7; border: 2px dashed #F59E0B; border-radius: 14px; text-align: center; padding: 18px; margin: 24px 0; }}
            .otp-code {{ font-size: 32px; font-weight: 900; color: #D97706; letter-spacing: 6px; font-family: monospace; }}
            .info-text {{ font-size: 14px; color: #4B5563; line-height: 1.6; margin-bottom: 12px; }}
            .footer {{ margin-top: 30px; padding-top: 18px; border-top: 1px solid #F3F4F6; font-size: 12px; color: #9CA3AF; text-align: center; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo-text">CocoMeo VIP Play Card</div>
                <h2 style="color: #1F2937; margin-top: 8px; font-size: 20px;">Yêu Cầu Tạo Mật Khẩu Mới</h2>
            </div>
            
            <p class="info-text">Xin chào <b>{username}</b>,</p>
            <p class="info-text">
                Hệ thống nhận được yêu cầu khôi phục mật khẩu để đăng nhập vào 
                <b>Hệ thống Thẻ Quyền Năng & Siêu Quyền Năng của CocoMeo</b>.
            </p>

            <div class="otp-box">
                <div style="font-size: 12px; font-weight: bold; color: #B45309; text-transform: uppercase; margin-bottom: 6px;">Mã Xác Nhận (OTP) Của Bạn</div>
                <div class="otp-code">{otp_code}</div>
                <div style="font-size: 11px; color: #92400E; margin-top: 6px;">Hiệu lực trong vòng <b>15 phút</b></div>
            </div>

            <p class="info-text">
                Vui lòng nhập mã OTP trên vào giao diện web để thiết lập mật khẩu mới ngay lập tức.
            </p>
            <p class="info-text" style="color: #DC2626; font-size: 12px;">
                ⚠️ Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email. Tài khoản của bạn vẫn an toàn.
            </p>

            <div class="footer">
                Email tự động từ Hệ thống Thẻ Quyền Năng & Siêu Quyền Năng CocoMeo.<br>
                CS1 Hoà Xuân • CS2 Ngũ Hành Sơn • CS3 Phạm Hùng
            </div>
        </div>
    </body>
    </html>
    """

    # Nếu có thông tin SMTP password cấu hình, gửi email thật qua SMTP
    if smtp_user and smtp_pass:
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{sender_name} <{sender_email}>"
            msg['To'] = to_email

            part_text = MIMEText(f"Mã OTP khôi phục mật khẩu CocoMeo của bạn là: {otp_code} (hiệu lực 15 phút)", 'plain', 'utf-8')
            part_html = MIMEText(html_content, 'html', 'utf-8')
            msg.attach(part_text)
            msg.attach(part_html)

            server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
            server.ehlo()
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(sender_email, [to_email], msg.as_string())
            server.quit()
            print(f"[EMAIL SERVICE] Da gui email OTP thanh cong toi: {to_email}")
            return True, f"Đã gửi email chứa mã xác nhận tới {to_email}"
        except Exception as e:
            print(f"[EMAIL SERVICE ERROR] Khong the gui qua SMTP: {e}")
            return False, f"Lỗi gửi email SMTP: {str(e)}"
    else:
        # Khi chưa có biến môi trường SMTP_PASS (ví dụ chạy local test):
        print(f"================================================================")
        print(f"[EMAIL SERVICE LOG] Gui OTP khoi phuc mat khau:")
        print(f" Den email: {to_email}")
        print(f" Ma OTP: {otp_code}")
        print(f" Ten dang nhap: {username}")
        print(f"================================================================")
        return True, f"Mã xác thực đã được gửi tới {to_email}"
