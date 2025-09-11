#!/usr/bin/env python3
"""
测试邮箱冲突检查
检查不同大小写的邮箱是否被认为是重复
"""

import sys
import os
import asyncio

# 添加后端路径
sys.path.append(os.path.join(os.path.dirname(__file__), 'src', 'backend'))

try:
    from database import db_manager
    from auth_api.user_utils import create_user
    from auth_api.email_service import EmailService
except ImportError as e:
    print(f"❌ 无法导入模块: {e}")
    sys.exit(1)

async def test_email_conflict():
    """测试邮箱冲突检查"""
    print("🧪 测试邮箱冲突检查逻辑...")
    
    try:
        # 初始化数据库连接
        await db_manager.initialize()
        print("✅ 数据库连接成功")
        
        test_email = "yusonglin22@mails.ucas.ac.cn"
        test_email_variants = [
            test_email,
            test_email.upper(),
            test_email.lower(),
            "YuSongLin22@mails.ucas.ac.cn"
        ]
        
        print(f"\n📧 测试邮箱: {test_email}")
        print("🔍 检查各种大小写变体:")
        
        for i, email_variant in enumerate(test_email_variants, 1):
            print(f"\n{i}. 检查邮箱: {email_variant}")
            
            # 检查数据库中是否存在
            existing_user = await db_manager.get_user_by_email(email_variant)
            if existing_user:
                print(f"   ✅ 数据库中找到用户: {existing_user['name']} ({existing_user['email']})")
            else:
                print("   ❌ 数据库中未找到用户")
            
            # 测试创建用户（会触发重复检查）
            try:
                user = await create_user(
                    name=f"测试用户{i}",
                    email=email_variant,
                    password="test123",
                    email_verified=True
                )
                print(f"   ✅ 用户创建成功: {user['id']}")
                
                # 立即删除测试用户
                await db_manager.delete_user_by_email(email_variant.lower())
                print("   🗑️ 测试用户已删除")
                
            except Exception as e:
                error_msg = str(e)
                if "already exists" in error_msg.lower() or "duplicate" in error_msg.lower():
                    print(f"   ⚠️ 用户已存在错误: {error_msg}")
                else:
                    print(f"   ❌ 其他错误: {error_msg}")
        
        print("\n🔍 测试验证码发送:")
        email_service = EmailService()
        
        for email_variant in test_email_variants[:2]:  # 只测试前两个
            print(f"\n📧 测试邮箱: {email_variant}")
            result = await email_service.send_verification_code(
                email=email_variant,
                purpose="register"
            )
            if result["success"]:
                print("   ✅ 验证码发送成功")
            else:
                print(f"   ❌ 验证码发送失败: {result.get('message', '未知错误')}")
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
    finally:
        try:
            await db_manager.close()
            print("\n✅ 数据库连接已关闭")
        except:
            pass

if __name__ == "__main__":
    try:
        asyncio.run(test_email_conflict())
    except KeyboardInterrupt:
        print("\n👋 程序被中断")
    except Exception as e:
        print(f"❌ 程序运行出错: {e}")