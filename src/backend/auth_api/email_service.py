"""
Email verification service for MatterAI Agent authentication system
"""
import os
import random
import string
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Optional
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

# Email configuration from environment variables
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USERNAME)
FROM_NAME = os.getenv("FROM_NAME", "MatterAI Agent")
EMAIL_MOCK_MODE = os.getenv("EMAIL_MOCK_MODE", "false").lower() == "true"

# Verification code settings
CODE_LENGTH = 6
CODE_EXPIRE_MINUTES = 10
MAX_ATTEMPTS = 3

# In-memory storage for verification codes (in production, use Redis)
verification_codes: Dict[str, Dict] = {}

class EmailService:
    """Email service for sending verification codes"""
    
    def __init__(self):
        self.smtp_config = {
            'hostname': SMTP_HOST,
            'port': SMTP_PORT,
            'username': SMTP_USERNAME,
            'password': SMTP_PASSWORD,
            'use_tls': True,
            'start_tls': True,
            'timeout': 30
        }
    
    def generate_verification_code(self) -> str:
        """Generate a 6-digit verification code"""
        return ''.join(random.choices(string.digits, k=CODE_LENGTH))
    
    async def send_email(self, to_email: str, subject: str, html_content: str) -> bool:
        """Send email using SMTP"""
        # Mock mode for testing
        if EMAIL_MOCK_MODE:
            print(f"📧 [模拟模式] 邮件发送到: {to_email}")
            print(f"📧 [模拟模式] 主题: {subject}")
            # 从HTML内容中提取验证码
            import re
            code_match = re.search(r'验证码：(\d{6})', html_content)
            if code_match:
                print(f"🔢 [模拟模式] 验证码: {code_match.group(1)}")
            print("✅ [模拟模式] 邮件发送成功")
            return True
        
        try:
            print(f"🔄 准备发送邮件到: {to_email}")
            print(f"📧 SMTP服务器: {SMTP_HOST}:{SMTP_PORT}")
            
            message = MIMEMultipart('alternative')
            message['Subject'] = subject
            message['From'] = f"{FROM_NAME} <{FROM_EMAIL}>"
            message['To'] = to_email
            
            # Add HTML content
            html_part = MIMEText(html_content, 'html', 'utf-8')
            message.attach(html_part)
            
            # Try multiple connection methods for QQ Mail
            try:
                # Method 1: Standard TLS connection
                print("🔄 尝试标准TLS连接...")
                await aiosmtplib.send(
                    message,
                    hostname=self.smtp_config['hostname'],
                    port=self.smtp_config['port'],
                    username=self.smtp_config['username'],
                    password=self.smtp_config['password'],
                    use_tls=True,
                    start_tls=False,
                    timeout=30
                )
                print(f"✅ 邮件发送成功 (标准TLS): {to_email}")
                return True
                
            except Exception as e1:
                print(f"⚠️ 标准TLS连接失败: {e1}")
                
                try:
                    # Method 2: STARTTLS connection
                    print("🔄 尝试STARTTLS连接...")
                    await aiosmtplib.send(
                        message,
                        hostname=self.smtp_config['hostname'],
                        port=self.smtp_config['port'],
                        username=self.smtp_config['username'],
                        password=self.smtp_config['password'],
                        use_tls=False,
                        start_tls=True,
                        timeout=30
                    )
                    print(f"✅ 邮件发送成功 (STARTTLS): {to_email}")
                    return True
                    
                except Exception as e2:
                    print(f"⚠️ STARTTLS连接失败: {e2}")
                    
                    try:
                        # Method 3: SSL connection on port 465
                        print("🔄 尝试SSL连接 (端口465)...")
                        await aiosmtplib.send(
                            message,
                            hostname=self.smtp_config['hostname'],
                            port=465,
                            username=self.smtp_config['username'],
                            password=self.smtp_config['password'],
                            use_tls=True,
                            start_tls=False,
                            timeout=30
                        )
                        print(f"✅ 邮件发送成功 (SSL 465): {to_email}")
                        return True
                        
                    except Exception as e3:
                        print(f"❌ 所有连接方法都失败了:")
                        print(f"  - 标准TLS: {e1}")
                        print(f"  - STARTTLS: {e2}")  
                        print(f"  - SSL 465: {e3}")
                        return False
            
        except Exception as e:
            print(f"❌ 发送邮件失败 {to_email}: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def create_verification_email_template(self, code: str, purpose: str) -> str:
        """Create HTML email template for verification code"""
        purpose_text = {
            'register': '注册账户',
            'password_reset': '重置密码', 
            'email_binding': '绑定邮箱'
        }.get(purpose, '验证操作')
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>MatterAI Agent - 邮箱验证</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
                <h1 style="color: white; margin: 0; font-size: 28px;">MatterAI Agent</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">材料科学智能助手</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #333; margin-top: 0;">邮箱验证码</h2>
                <p style="color: #666; font-size: 16px; line-height: 1.6;">
                    您正在进行<strong>{purpose_text}</strong>操作，请使用以下验证码完成验证：
                </p>
                
                <div style="background: white; border: 2px dashed #667eea; padding: 20px; margin: 25px 0; text-align: center; border-radius: 8px;">
                    <span style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px;">{code}</span>
                </div>
                
                <p style="color: #666; font-size: 14px;">
                    <strong>注意事项：</strong><br>
                    • 验证码有效期为 <strong>{CODE_EXPIRE_MINUTES} 分钟</strong><br>
                    • 请勿将验证码泄露给他人<br>
                    • 如非本人操作，请忽略此邮件
                </p>
            </div>
            
            <div style="text-align: center; color: #999; font-size: 12px;">
                <p>此邮件为系统自动发送，请勿直接回复</p>
                <p>&copy; 2024 MatterAI Agent. All rights reserved.</p>
            </div>
        </body>
        </html>
        """
    
    async def send_verification_code(self, email: str, purpose: str) -> Dict:
        """Send verification code to email"""
        email = email.strip().lower()
        # Check if email service is configured
        if not SMTP_USERNAME or not SMTP_PASSWORD:
            return {
                "success": False,
                "message": "邮件服务未配置，请联系管理员"
            }
        
        # Generate verification code
        code = self.generate_verification_code()
        
        # Store verification code with expiration
        verification_codes[email] = {
            'code': code,
            'purpose': purpose,
            'created_at': datetime.utcnow(),
            'expires_at': datetime.utcnow() + timedelta(minutes=CODE_EXPIRE_MINUTES),
            'attempts': 0
        }
        
        # Create email content
        subject = f"MatterAI Agent 验证码 - {code}"
        html_content = self.create_verification_email_template(code, purpose)
        
        # Send email
        success = await self.send_email(email, subject, html_content)
        
        if success:
            return {
                "success": True,
                "message": f"验证码已发送到 {email}，请在 {CODE_EXPIRE_MINUTES} 分钟内完成验证",
                "expires_in": CODE_EXPIRE_MINUTES * 60  # seconds
            }
        else:
            # Remove failed code
            verification_codes.pop(email, None)
            return {
                "success": False,
                "message": "验证码发送失败，请稍后重试"
            }
    
    def verify_code(self, email: str, code: str, purpose: str) -> Dict:
        """Verify the verification code"""
        email = email.strip().lower()
        stored_data = verification_codes.get(email)
        
        if not stored_data:
            return {
                "success": False,
                "message": "验证码不存在或已过期"
            }
        
        # Check expiration
        if datetime.utcnow() > stored_data['expires_at']:
            verification_codes.pop(email, None)
            return {
                "success": False,
                "message": "验证码已过期，请重新获取"
            }
        
        # Check purpose
        if stored_data['purpose'] != purpose:
            return {
                "success": False,
                "message": "验证码用途不匹配"
            }
        
        # Check attempts
        if stored_data['attempts'] >= MAX_ATTEMPTS:
            verification_codes.pop(email, None)
            return {
                "success": False,
                "message": "验证码输入错误次数过多，请重新获取"
            }
        
        # Verify code
        if stored_data['code'] == code:
            # Success - remove code
            verification_codes.pop(email, None)
            return {
                "success": True,
                "message": "验证码验证成功"
            }
        else:
            # Wrong code - increment attempts
            stored_data['attempts'] += 1
            remaining_attempts = MAX_ATTEMPTS - stored_data['attempts']
            
            if remaining_attempts > 0:
                return {
                    "success": False,
                    "message": f"验证码错误，还可尝试 {remaining_attempts} 次"
                }
            else:
                verification_codes.pop(email, None)
                return {
                    "success": False,
                    "message": "验证码输入错误次数过多，请重新获取"
                }
    
    def cleanup_expired_codes(self):
        """Clean up expired verification codes"""
        now = datetime.utcnow()
        expired_emails = [
            email for email, data in verification_codes.items()
            if now > data['expires_at']
        ]
        
        for email in expired_emails:
            verification_codes.pop(email, None)
        
        if expired_emails:
            print(f"🗑️ Cleaned up {len(expired_emails)} expired verification codes")

# Global email service instance
email_service = EmailService()

# Cleanup task - run every 5 minutes
async def cleanup_task():
    """Background task to clean up expired codes"""
    while True:
        try:
            email_service.cleanup_expired_codes()
            await asyncio.sleep(300)  # 5 minutes
        except Exception as e:
            print(f"❌ Error in cleanup task: {e}")
            await asyncio.sleep(300)

def start_cleanup_task():
    """Start the cleanup background task"""
    asyncio.create_task(cleanup_task())