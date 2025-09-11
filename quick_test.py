#!/usr/bin/env python3
"""快速测试脚本 - 验证邮箱验证系统"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'src', 'backend'))

def test_imports():
    """测试所有模块导入"""
    print("🔍 测试模块导入...")
    
    try:
        from auth_api.email_service import email_service
        print("✅ 邮箱服务导入成功")
        
        from auth_api.models import SendVerificationCodeRequest, VerifyCodeRequest
        print("✅ 数据模型导入成功")
        
        from auth_api.auth_routes import router
        print("✅ 认证路由导入成功")
        
        from database import db_manager
        print("✅ 数据库管理器导入成功")
        
        import main
        print("✅ 主服务器模块导入成功")
        
        return True
    except Exception as e:
        print(f"❌ 导入失败: {e}")
        return False

def test_basic_functions():
    """测试基本功能"""
    print("\n🧪 测试基本功能...")
    
    try:
        from auth_api.email_service import email_service
        
        # 测试验证码生成
        code = email_service.generate_verification_code()
        print(f"✅ 验证码生成: {code}")
        
        # 测试邮箱模板
        template = email_service.create_verification_email_template(code, "register")
        print(f"✅ 邮箱模板生成: {len(template)} 字符")
        
        # 测试验证逻辑
        from auth_api.email_service import verification_codes
        from datetime import datetime, timedelta
        
        test_email = "test@example.com"
        verification_codes[test_email] = {
            'code': '123456',
            'purpose': 'register',
            'created_at': datetime.now(),
            'expires_at': datetime.now() + timedelta(minutes=10),
            'attempts': 0
        }
        
        result = email_service.verify_code(test_email, '123456', 'register')
        if result["success"]:
            print("✅ 验证码验证逻辑正常")
        else:
            print(f"❌ 验证失败: {result['message']}")
            
        return True
    except Exception as e:
        print(f"❌ 功能测试失败: {e}")
        return False

def check_environment():
    """检查环境配置"""
    print("\n📋 检查环境配置...")
    
    # 检查邮箱配置
    email_vars = ["SMTP_HOST", "SMTP_USERNAME", "SMTP_PASSWORD"]
    email_configured = all(os.getenv(var) for var in email_vars)
    
    if email_configured:
        print("✅ 邮箱服务器配置完整")
    else:
        print("⚠️ 邮箱服务器未完全配置")
        print("   需要在 .env 文件中配置 SMTP 相关变量")
    
    # 检查数据库配置
    db_vars = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"]
    db_configured = all(os.getenv(var) for var in db_vars)
    
    if db_configured:
        print("✅ 数据库配置完整")
    else:
        print("⚠️ 数据库未完全配置")
        print("   需要在 .env 文件中配置数据库相关变量")
    
    return email_configured and db_configured

if __name__ == "__main__":
    print("🚀 MatterAI Agent 邮箱验证系统快速测试")
    print("=" * 50)
    
    # 测试导入
    imports_ok = test_imports()
    
    if imports_ok:
        # 测试功能
        functions_ok = test_basic_functions()
        
        # 检查环境
        env_ok = check_environment()
        
        print("\n" + "=" * 50)
        print("📊 测试结果:")
        print(f"   模块导入: {'✅' if imports_ok else '❌'}")
        print(f"   基本功能: {'✅' if functions_ok else '❌'}")
        print(f"   环境配置: {'✅' if env_ok else '⚠️'}")
        
        if imports_ok and functions_ok:
            print("\n🎉 系统基本功能正常！")
            print("\n📝 下一步:")
            print("   1. 配置 .env 文件中的邮箱和数据库参数")
            print("   2. 启动后端服务: cd src/backend && python main.py")
            print("   3. 启动前端服务: cd src/frontend && npm start")
            print("   4. 在浏览器中测试完整的邮箱验证流程")
        else:
            print("\n❌ 发现问题，请检查错误信息")
    
    print("\n" + "=" * 50)