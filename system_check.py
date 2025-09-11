#!/usr/bin/env python3
"""
MatterAI Agent 邮箱验证系统 - 最终系统检查
检查所有组件是否已正确配置并可以启动
"""

import os
import sys
import subprocess
import asyncio

def check_backend():
    """检查后端系统"""
    print("🔍 检查后端系统...")
    
    # 检查虚拟环境
    venv_path = ".venv/bin/activate"
    if os.path.exists(venv_path):
        print("✅ 虚拟环境存在")
    else:
        print("❌ 虚拟环境不存在")
        return False
    
    # 检查依赖
    try:
        os.chdir("src/backend")
        sys.path.append(".")
        
        # 测试导入
        from auth_api.email_service import email_service
        from auth_api.models import SendVerificationCodeRequest
        from database import db_manager
        print("✅ 后端模块导入成功")
        
        # 测试基本功能
        code = email_service.generate_verification_code()
        print(f"✅ 验证码生成成功: {code}")
        
        os.chdir("../..")
        return True
        
    except Exception as e:
        print(f"❌ 后端检查失败: {e}")
        os.chdir("../..")
        return False

def check_frontend():
    """检查前端系统"""
    print("\n🔍 检查前端系统...")
    
    frontend_dir = "src/frontend"
    if not os.path.exists(frontend_dir):
        print("❌ 前端目录不存在")
        return False
    
    # 检查 package.json
    package_json = os.path.join(frontend_dir, "package.json")
    if os.path.exists(package_json):
        print("✅ package.json 存在")
    else:
        print("❌ package.json 不存在")
        return False
    
    # 检查 node_modules
    node_modules = os.path.join(frontend_dir, "node_modules")
    if os.path.exists(node_modules):
        print("✅ node_modules 存在")
    else:
        print("❌ node_modules 不存在，需要运行 npm install")
        return False
    
    # 检查关键组件
    key_files = [
        "src/components/auth/EmailVerification.tsx",
        "src/components/auth/RegisterWithVerificationForm.tsx", 
        "src/components/auth/ForgotPasswordForm.tsx",
        "src/components/auth/ProfilePage.tsx"
    ]
    
    for file in key_files:
        full_path = os.path.join(frontend_dir, file)
        if os.path.exists(full_path):
            print(f"✅ {os.path.basename(file)} 存在")
        else:
            print(f"❌ {os.path.basename(file)} 不存在")
            return False
    
    return True

def check_configuration():
    """检查配置文件"""
    print("\n🔍 检查配置...")
    
    # 检查 .env 文件
    if os.path.exists(".env"):
        print("✅ .env 文件存在")
        
        # 读取并检查关键配置
        with open(".env", "r") as f:
            env_content = f.read()
        
        required_vars = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"]
        email_vars = ["SMTP_HOST", "SMTP_USERNAME", "SMTP_PASSWORD"]
        
        missing_db = [var for var in required_vars if var not in env_content]
        missing_email = [var for var in email_vars if var not in env_content]
        
        if not missing_db:
            print("✅ 数据库配置完整")
        else:
            print(f"⚠️ 缺少数据库配置: {', '.join(missing_db)}")
        
        if not missing_email:
            print("✅ 邮箱配置完整")
        else:
            print(f"⚠️ 缺少邮箱配置: {', '.join(missing_email)}")
        
    else:
        print("⚠️ .env 文件不存在")
        print("   请创建 .env 文件并配置数据库和邮箱参数")
    
    # 检查 EMAIL_SETUP.md
    if os.path.exists("EMAIL_SETUP.md"):
        print("✅ 邮箱配置说明文档存在")
    else:
        print("⚠️ 邮箱配置说明文档不存在")
    
    return True

def check_files():
    """检查关键文件"""
    print("\n🔍 检查关键文件...")
    
    backend_files = [
        "src/backend/auth_api/email_service.py",
        "src/backend/auth_api/auth_routes.py", 
        "src/backend/auth_api/models.py",
        "src/backend/database.py",
        "src/backend/auth_requirements.txt"
    ]
    
    for file in backend_files:
        if os.path.exists(file):
            print(f"✅ {os.path.basename(file)}")
        else:
            print(f"❌ {os.path.basename(file)} 不存在")
            return False
    
    return True

def print_startup_instructions():
    """打印启动说明"""
    print("\n" + "="*60)
    print("🚀 系统启动说明")
    print("="*60)
    
    print("\n1️⃣ 配置环境变量 (.env 文件):")
    print("   # 数据库配置")
    print("   DB_HOST=your-database-host")
    print("   DB_NAME=your-database-name") 
    print("   DB_USER=your-database-user")
    print("   DB_PASSWORD=your-database-password")
    print("")
    print("   # 邮箱服务器配置")  
    print("   SMTP_HOST=smtp.gmail.com")
    print("   SMTP_PORT=587")
    print("   SMTP_USERNAME=your-email@gmail.com")
    print("   SMTP_PASSWORD=your-app-password")
    print("   FROM_EMAIL=your-email@gmail.com") 
    print("   FROM_NAME=MatterAI Agent")
    
    print("\n2️⃣ 启动后端服务:")
    print("   cd src/backend")
    print("   source ../../.venv/bin/activate")
    print("   python main.py")
    
    print("\n3️⃣ 启动前端服务 (新终端):")
    print("   cd src/frontend")
    print("   npm start")
    
    print("\n4️⃣ 测试邮箱验证功能:")
    print("   访问 http://localhost:3000")
    print("   - 尝试\"邮箱验证注册\"")
    print("   - 测试\"忘记密码\"功能")
    print("   - 登录后查看个人信息页面")
    
    print("\n📖 详细配置说明请参考 EMAIL_SETUP.md")

if __name__ == "__main__":
    print("🔍 MatterAI Agent 邮箱验证系统 - 系统检查")
    print("="*60)
    
    # 执行各项检查
    backend_ok = check_backend()
    frontend_ok = check_frontend()  
    config_ok = check_configuration()
    files_ok = check_files()
    
    # 总结检查结果
    print("\n" + "="*60)
    print("📊 系统检查结果")
    print("="*60)
    
    print(f"后端系统:   {'✅ 正常' if backend_ok else '❌ 异常'}")
    print(f"前端系统:   {'✅ 正常' if frontend_ok else '❌ 异常'}")
    print(f"配置文件:   {'✅ 正常' if config_ok else '❌ 异常'}") 
    print(f"关键文件:   {'✅ 正常' if files_ok else '❌ 异常'}")
    
    all_ok = backend_ok and frontend_ok and config_ok and files_ok
    
    if all_ok:
        print("\n🎉 系统检查通过！邮箱验证系统已准备就绪")
        print_startup_instructions()
    else:
        print("\n❌ 系统检查发现问题，请修复后重新检查")
    
    print("\n" + "="*60)