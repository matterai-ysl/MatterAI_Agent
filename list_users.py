#!/usr/bin/env python3
"""
快速查看用户列表工具
不需要交互，直接显示所有用户信息
"""

import sys
import os
import asyncio
from datetime import datetime

# 添加后端路径
sys.path.append(os.path.join(os.path.dirname(__file__), 'src', 'backend'))

try:
    from database import db_manager
except ImportError as e:
    print(f"❌ 无法导入数据库模块: {e}")
    print("请确保在 MatterAI_Agent 项目根目录运行此脚本")
    sys.exit(1)

async def list_all_users():
    """列出所有用户"""
    print("🔍 MatterAI Agent 用户列表")
    print("="*80)
    
    try:
        # 初始化数据库
        await db_manager.initialize()
        print("✅ 数据库连接成功\n")
        
        # 查询所有用户
        query = """
        SELECT id, name, email, is_admin, email_verified, verification_email, created_at, updated_at
        FROM users 
        ORDER BY created_at DESC;
        """
        
        async with db_manager.pool.acquire() as connection:
            results = await connection.fetch(query)
        
        if not results:
            print("📭 数据库中暂无用户")
            return
        
        print(f"📊 共找到 {len(results)} 个用户:\n")
        
        # 表头
        print(f"{'序号':<4} {'姓名':<20} {'邮箱':<30} {'状态':<15} {'注册时间':<20}")
        print("-" * 95)
        
        # 用户信息
        for i, user in enumerate(results, 1):
            # 格式化状态
            status_parts = []
            if user['is_admin']:
                status_parts.append("👑管理员")
            else:
                status_parts.append("👤用户")
            
            if user['email_verified']:
                status_parts.append("✅已验证")
            else:
                status_parts.append("❌未验证")
            
            status = " ".join(status_parts)
            
            # 格式化时间
            created_time = user['created_at'].strftime("%Y-%m-%d %H:%M")
            
            # 截断长文本
            name = user['name'][:18] + ".." if len(user['name']) > 20 else user['name']
            email = user['email'][:28] + ".." if len(user['email']) > 30 else user['email']
            
            print(f"{i:<4} {name:<20} {email:<30} {status:<15} {created_time:<20}")
            
            # 如果有绑定中的邮箱，显示在下一行
            if user['verification_email']:
                print(f"     {'→ 绑定中:':<20} {user['verification_email']:<30}")
        
        print("-" * 95)
        print(f"\n💡 使用完整管理工具: python user_management_debug.py")
        
    except Exception as e:
        print(f"❌ 获取用户列表失败: {e}")
        import traceback
        traceback.print_exc()
    finally:
        try:
            await db_manager.close()
        except:
            pass

if __name__ == "__main__":
    try:
        asyncio.run(list_all_users())
    except KeyboardInterrupt:
        print("\n👋 程序被中断")
    except Exception as e:
        print(f"❌ 程序运行出错: {e}")