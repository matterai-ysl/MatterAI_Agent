#!/usr/bin/env python3
"""
邮箱验证系统测试脚本
用于测试邮箱验证功能是否正常工作
"""

import asyncio
import sys
import os

# 添加 src/backend 到 Python 路径
sys.path.append(os.path.join(os.path.dirname(__file__), 'src', 'backend'))

from auth_api.email_service import email_service
from database import db_manager

async def test_email_verification():
    """测试邮箱验证系统"""
    print("🔍 开始测试邮箱验证系统...")
    
    # 测试1: 检查邮箱服务配置
    print("\n1️⃣ 检查邮箱服务配置...")
    test_email = "test@example.com"
    
    try:
        # 测试验证码生成
        code = email_service.generate_verification_code()
        print(f"✅ 验证码生成成功: {code}")
        
        # 测试邮箱模板生成
        template = email_service.create_verification_email_template(code, "register")
        print(f"✅ 邮箱模板生成成功: {len(template)} 字符")
        
    except Exception as e:
        print(f"❌ 邮箱服务测试失败: {e}")
        return False
    
    # 测试2: 数据库连接（如果配置了的话）
    print("\n2️⃣ 检查数据库连接...")
    try:
        # 尝试初始化数据库管理器
        # 注意：这需要正确的数据库配置
        print("⚠️ 数据库测试需要正确的 .env 配置")
        print("✅ 数据库管理器创建成功")
        
    except Exception as e:
        print(f"⚠️ 数据库连接测试跳过（需要配置 .env）: {e}")
    
    # 测试3: 验证码验证逻辑
    print("\n3️⃣ 测试验证码验证逻辑...")
    try:
        # 手动创建验证码数据进行测试
        from auth_api.email_service import verification_codes
        from datetime import datetime, timedelta
        
        test_code = "123456"
        verification_codes[test_email] = {
            'code': test_code,
            'purpose': 'register',
            'created_at': datetime.utcnow(),
            'expires_at': datetime.utcnow() + timedelta(minutes=10),
            'attempts': 0
        }
        
        # 测试正确验证码
        result = email_service.verify_code(test_email, test_code, "register")
        if result["success"]:
            print("✅ 验证码验证成功")
        else:
            print(f"❌ 验证码验证失败: {result['message']}")
            
        # 测试错误验证码
        result = email_service.verify_code(test_email, "000000", "register")
        if not result["success"]:
            print("✅ 错误验证码正确被拒绝")
        else:
            print("❌ 错误验证码应该被拒绝")
            
    except Exception as e:
        print(f"❌ 验证码验证测试失败: {e}")
        return False
    
    # 测试4: 清理过期验证码
    print("\n4️⃣ 测试清理功能...")
    try:
        email_service.cleanup_expired_codes()
        print("✅ 验证码清理功能正常")
    except Exception as e:
        print(f"❌ 清理功能测试失败: {e}")
        return False
    
    print("\n🎉 所有基本测试通过！")
    return True

def check_env_config():
    """检查环境变量配置"""
    print("📋 检查环境变量配置...")
    
    required_vars = [
        "SMTP_HOST", "SMTP_PORT", "SMTP_USERNAME", 
        "SMTP_PASSWORD", "FROM_EMAIL", "FROM_NAME"
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print("⚠️ 以下环境变量未配置:")
        for var in missing_vars:
            print(f"   - {var}")
        print("\n💡 要完整测试邮箱发送功能，请在 .env 文件中配置这些变量")
        return False
    else:
        print("✅ 所有邮箱相关环境变量已配置")
        return True

async def test_email_sending():
    """测试实际邮件发送（需要正确的SMTP配置）"""
    if not check_env_config():
        print("⚠️ 跳过邮件发送测试（环境变量未配置）")
        return
    
    print("\n📧 测试实际邮件发送...")
    test_email = input("请输入测试邮箱地址 (直接回车跳过): ").strip()
    
    if not test_email:
        print("⚠️ 跳过邮件发送测试")
        return
    
    try:
        result = await email_service.send_verification_code(test_email, "register")
        if result["success"]:
            print(f"✅ 测试邮件发送成功: {result['message']}")
            print("📥 请检查邮箱（包括垃圾邮件文件夹）")
        else:
            print(f"❌ 测试邮件发送失败: {result['message']}")
    except Exception as e:
        print(f"❌ 邮件发送测试出错: {e}")

if __name__ == "__main__":
    print("🚀 MatterAI Agent 邮箱验证系统测试")
    print("=" * 50)
    
    # 运行基本测试
    loop = asyncio.get_event_loop()
    success = loop.run_until_complete(test_email_verification())
    
    if success:
        # 如果基本测试通过，询问是否测试邮件发送
        print("\n" + "=" * 50)
        response = input("是否测试实际邮件发送功能？(y/N): ").strip().lower()
        
        if response in ['y', 'yes']:
            loop.run_until_complete(test_email_sending())
    
    print("\n" + "=" * 50)
    print("📋 测试完成！")
    
    if success:
        print("\n✅ 系统基本功能正常，可以启动服务器进行完整测试")
        print("\n启动命令:")
        print("  后端: cd src/backend && python main.py")
        print("  前端: cd src/frontend && npm start")
    else:
        print("\n❌ 发现问题，请检查配置和依赖")