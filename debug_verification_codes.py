#!/usr/bin/env python3
"""
调试验证码存储状态
检查内存中的验证码数据
"""

import sys
import os

# 添加后端路径
sys.path.append(os.path.join(os.path.dirname(__file__), 'src', 'backend'))

try:
    from auth_api.email_service import verification_codes
except ImportError as e:
    print(f"❌ 无法导入邮件服务模块: {e}")
    sys.exit(1)

def debug_verification_codes():
    """调试验证码存储状态"""
    print("🔍 检查验证码内存存储状态:")
    print("=" * 60)
    
    if not verification_codes:
        print("📭 内存中没有验证码数据")
        return
    
    print(f"📊 内存中共有 {len(verification_codes)} 个验证码:")
    
    for email, data in verification_codes.items():
        print(f"\n📧 邮箱: {email}")
        print(f"   验证码: {data.get('code', 'N/A')}")
        print(f"   用途: {data.get('purpose', 'N/A')}")
        print(f"   创建时间: {data.get('created_at', 'N/A')}")
        print(f"   过期时间: {data.get('expires_at', 'N/A')}")
        print(f"   尝试次数: {data.get('attempts', 0)}")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    debug_verification_codes()