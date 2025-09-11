#!/usr/bin/env python3
"""
用户管理调试工具
用于查看、管理和删除用户账号
"""

import sys
import os
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Optional

# 添加后端路径
sys.path.append(os.path.join(os.path.dirname(__file__), 'src', 'backend'))

try:
    from database import db_manager
except ImportError as e:
    print(f"❌ 无法导入数据库模块: {e}")
    print("请确保在 MatterAI_Agent 项目根目录运行此脚本")
    sys.exit(1)

class UserManager:
    """用户管理类"""
    
    def __init__(self):
        self.db = db_manager
    
    def _normalize_user_fields(self, user: Dict) -> Dict:
        """映射字段名从驼峰到下划线"""
        normalized = user.copy()
        
        # 映射字段名
        field_mapping = {
            'isAdmin': 'is_admin',
            'emailVerified': 'email_verified',
            'verificationEmail': 'verification_email',
            'createdAt': 'created_at',
            'updatedAt': 'updated_at'
        }
        
        for camel_key, snake_key in field_mapping.items():
            if camel_key in normalized:
                normalized[snake_key] = normalized.pop(camel_key)
        
        return normalized
    
    async def initialize(self):
        """初始化数据库连接"""
        try:
            await self.db.initialize()
            print("✅ 数据库连接成功")
            return True
        except Exception as e:
            print(f"❌ 数据库连接失败: {e}")
            return False
    
    async def list_all_users(self) -> List[Dict]:
        """获取所有用户列表"""
        query = """
        SELECT id, name, email, is_admin, email_verified, verification_email, created_at, updated_at
        FROM users 
        ORDER BY created_at DESC;
        """
        
        try:
            async with self.db.pool.acquire() as connection:
                results = await connection.fetch(query)
                
                users = []
                for row in results:
                    users.append({
                        "id": str(row['id']),
                        "name": row['name'],
                        "email": row['email'],
                        "is_admin": row['is_admin'],
                        "email_verified": row['email_verified'],
                        "verification_email": row['verification_email'],
                        "created_at": row['created_at'],
                        "updated_at": row['updated_at']
                    })
                
                return users
        except Exception as e:
            print(f"❌ 获取用户列表失败: {e}")
            return []
    
    async def get_user_by_email(self, email: str) -> Optional[Dict]:
        """根据邮箱获取用户信息"""
        try:
            user = await self.db.get_user_by_email(email)
            if user:
                # 移除密码哈希
                user.pop('password_hash', None)
                # 映射字段名从驼峰到下划线
                user = self._normalize_user_fields(user)
            return user
        except Exception as e:
            print(f"❌ 获取用户信息失败: {e}")
            return None
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict]:
        """根据ID获取用户信息"""
        try:
            user = await self.db.get_user_by_id(user_id)
            if user:
                # 映射字段名从驼峰到下划线
                user = self._normalize_user_fields(user)
            return user
        except Exception as e:
            print(f"❌ 获取用户信息失败: {e}")
            return None
    
    async def delete_user_by_id(self, user_id: str) -> bool:
        """根据ID删除用户"""
        query = "DELETE FROM users WHERE id = $1"
        
        try:
            async with self.db.pool.acquire() as connection:
                result = await connection.execute(query, user_id)
                return result != "DELETE 0"
        except Exception as e:
            print(f"❌ 删除用户失败: {e}")
            return False
    
    async def delete_user_by_email(self, email: str) -> bool:
        """根据邮箱删除用户"""
        query = "DELETE FROM users WHERE email = $1"
        
        try:
            async with self.db.pool.acquire() as connection:
                result = await connection.execute(query, email.lower())
                return result != "DELETE 0"
        except Exception as e:
            print(f"❌ 删除用户失败: {e}")
            return False
    
    async def update_user_email_verification(self, user_id: str, verified: bool) -> bool:
        """更新用户邮箱验证状态"""
        query = """
        UPDATE users 
        SET email_verified = $1, updated_at = $2
        WHERE id = $3
        """
        
        try:
            async with self.db.pool.acquire() as connection:
                result = await connection.execute(query, verified, datetime.now(timezone.utc), user_id)
                return result != "UPDATE 0"
        except Exception as e:
            print(f"❌ 更新用户状态失败: {e}")
            return False
    
    async def close(self):
        """关闭数据库连接"""
        try:
            await self.db.close()
            print("✅ 数据库连接已关闭")
        except Exception as e:
            print(f"⚠️ 关闭数据库连接时出错: {e}")

def format_user_info(user: Dict, index: Optional[int] = None) -> str:
    """格式化用户信息显示"""
    prefix = f"{index + 1:2d}. " if index is not None else "    "
    
    # 格式化时间
    created_time = user.get('created_at')
    if created_time:
        created_time = created_time.strftime("%Y-%m-%d %H:%M:%S")
    else:
        created_time = "未知"
    
    # 格式化状态
    status_parts = []
    if user.get('is_admin', False):
        status_parts.append("管理员")
    else:
        status_parts.append("普通用户")
    
    if user.get('email_verified', False):
        status_parts.append("✅已验证")
    else:
        status_parts.append("❌未验证")
    
    if user.get('verification_email'):
        status_parts.append(f"绑定中:{user['verification_email']}")
    
    status = " | ".join(status_parts)
    
    return f"""
{prefix}用户ID: {user.get('id', '未知')}
    姓名: {user.get('name', '未知')}
    邮箱: {user.get('email', '未知')}
    状态: {status}
    注册时间: {created_time}"""

async def interactive_menu(user_manager: UserManager):
    """交互式菜单"""
    while True:
        print("\n" + "="*60)
        print("🛠️  MatterAI Agent 用户管理工具")
        print("="*60)
        print("1. 查看所有用户")
        print("2. 根据邮箱查找用户")
        print("3. 根据ID查找用户")
        print("4. 删除用户 (根据邮箱)")
        print("5. 删除用户 (根据ID)")
        print("6. 更新用户邮箱验证状态")
        print("7. 退出")
        
        try:
            choice = input("\n请选择操作 (1-7): ").strip()
            
            if choice == "1":
                await list_users_action(user_manager)
            elif choice == "2":
                await find_user_by_email_action(user_manager)
            elif choice == "3":
                await find_user_by_id_action(user_manager)
            elif choice == "4":
                await delete_user_by_email_action(user_manager)
            elif choice == "5":
                await delete_user_by_id_action(user_manager)
            elif choice == "6":
                await update_verification_status_action(user_manager)
            elif choice == "7":
                print("👋 退出用户管理工具")
                break
            else:
                print("❌ 无效选择，请输入 1-7")
                
        except KeyboardInterrupt:
            print("\n👋 用户中断，退出程序")
            break
        except EOFError:
            print("\n👋 输入结束，退出程序")
            break
        except Exception as e:
            print(f"❌ 操作出错: {e}")

async def list_users_action(user_manager: UserManager):
    """显示所有用户"""
    print("\n🔍 获取用户列表...")
    users = await user_manager.list_all_users()
    
    if not users:
        print("📭 暂无用户")
        return
    
    print(f"\n📊 共找到 {len(users)} 个用户:")
    print("-" * 60)
    
    for i, user in enumerate(users):
        print(format_user_info(user, i))
    
    print("-" * 60)

async def find_user_by_email_action(user_manager: UserManager):
    """根据邮箱查找用户"""
    email = input("请输入邮箱地址: ").strip()
    if not email:
        print("❌ 邮箱地址不能为空")
        return
    
    print(f"\n🔍 查找邮箱: {email}")
    user = await user_manager.get_user_by_email(email)
    
    if user:
        print("✅ 找到用户:")
        print(format_user_info(user))
    else:
        print("❌ 未找到用户")

async def find_user_by_id_action(user_manager: UserManager):
    """根据ID查找用户"""
    user_id = input("请输入用户ID: ").strip()
    if not user_id:
        print("❌ 用户ID不能为空")
        return
    
    print(f"\n🔍 查找用户ID: {user_id}")
    user = await user_manager.get_user_by_id(user_id)
    
    if user:
        print("✅ 找到用户:")
        print(format_user_info(user))
    else:
        print("❌ 未找到用户")

async def delete_user_by_email_action(user_manager: UserManager):
    """根据邮箱删除用户"""
    email = input("请输入要删除的用户邮箱: ").strip()
    if not email:
        print("❌ 邮箱地址不能为空")
        return
    
    # 先查找用户
    user = await user_manager.get_user_by_email(email)
    if not user:
        print("❌ 未找到用户")
        return
    
    print("🔍 找到用户:")
    print(format_user_info(user))
    
    # 确认删除
    confirm = input(f"\n⚠️ 确认删除用户 {email} 吗？(输入 'DELETE' 确认): ").strip()
    if confirm != "DELETE":
        print("❌ 删除操作已取消")
        return
    
    success = await user_manager.delete_user_by_email(email)
    if success:
        print(f"✅ 用户 {email} 已成功删除")
    else:
        print(f"❌ 删除用户 {email} 失败")

async def delete_user_by_id_action(user_manager: UserManager):
    """根据ID删除用户"""
    user_id = input("请输入要删除的用户ID: ").strip()
    if not user_id:
        print("❌ 用户ID不能为空")
        return
    
    # 先查找用户
    user = await user_manager.get_user_by_id(user_id)
    if not user:
        print("❌ 未找到用户")
        return
    
    print("🔍 找到用户:")
    print(format_user_info(user))
    
    # 确认删除
    confirm = input(f"\n⚠️ 确认删除用户 {user['name']} ({user['email']}) 吗？(输入 'DELETE' 确认): ").strip()
    if confirm != "DELETE":
        print("❌ 删除操作已取消")
        return
    
    success = await user_manager.delete_user_by_id(user_id)
    if success:
        print(f"✅ 用户 {user['name']} 已成功删除")
    else:
        print(f"❌ 删除用户失败")

async def update_verification_status_action(user_manager: UserManager):
    """更新用户邮箱验证状态"""
    user_id = input("请输入用户ID: ").strip()
    if not user_id:
        print("❌ 用户ID不能为空")
        return
    
    # 先查找用户
    user = await user_manager.get_user_by_id(user_id)
    if not user:
        print("❌ 未找到用户")
        return
    
    print("🔍 找到用户:")
    print(format_user_info(user))
    
    current_status = "已验证" if user.get('email_verified', False) else "未验证"
    new_status = input(f"\n当前邮箱状态: {current_status}\n请输入新状态 (verified/unverified): ").strip().lower()
    
    if new_status not in ['verified', 'unverified']:
        print("❌ 无效状态，请输入 'verified' 或 'unverified'")
        return
    
    new_verified = new_status == 'verified'
    
    success = await user_manager.update_user_email_verification(user_id, new_verified)
    if success:
        status_text = "已验证" if new_verified else "未验证"
        print(f"✅ 用户 {user['name']} 的邮箱验证状态已更新为: {status_text}")
    else:
        print("❌ 更新用户状态失败")

async def main():
    """主函数"""
    print("🚀 MatterAI Agent 用户管理调试工具")
    print("="*60)
    
    user_manager = UserManager()
    
    # 初始化数据库连接
    if not await user_manager.initialize():
        print("❌ 数据库初始化失败，程序退出")
        return
    
    try:
        # 显示基本信息
        users = await user_manager.list_all_users()
        print(f"📊 数据库中共有 {len(users)} 个用户")
        
        # 启动交互菜单
        await interactive_menu(user_manager)
        
    finally:
        # 关闭数据库连接
        await user_manager.close()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 程序被中断")
    except Exception as e:
        print(f"❌ 程序运行出错: {e}")
        import traceback
        traceback.print_exc()