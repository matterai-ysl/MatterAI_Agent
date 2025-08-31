# test_rds.py
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import sys

# 加载 .env 文件
load_dotenv()

# 从环境变量读取配置
DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "port": int(os.getenv("DB_PORT", 5432)),
    "dbname": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "connect_timeout": 10,  # 连接超时 10 秒
}

def test_connection():
    print("🔍 正在测试与阿里云 RDS PostgreSQL 的连接...\n")
    
    # 检查环境变量是否完整
    missing = []
    for k, v in DB_CONFIG.items():
        if not v:
            missing.append(k)
    if missing:
        print(f"❌ 错误：缺少以下配置项，请检查 .env 文件：{', '.join(missing)}")
        return False

    print(f"📌 正在连接：")
    print(f"   Host: {DB_CONFIG['host']}")
    print(f"   Port: {DB_CONFIG['port']}")
    print(f"   DB:   {DB_CONFIG['dbname']}")
    print(f"   User: {DB_CONFIG['user']}")
    print()

    conn = None
    try:
        print("🚀 正在尝试连接...")
        conn = psycopg2.connect(**DB_CONFIG)
        
        print("✅ 连接成功！正在执行测试查询...")
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT NOW() as current_time, version() as pg_version;")
        result = cursor.fetchone()
        
        print("🎉 数据库响应：")
        print(f"   当前时间: {result['current_time']}")
        print(f"   PostgreSQL 版本: {result['pg_version'][:50]}...")
        
        cursor.close()
        return True

    except psycopg2.OperationalError as e:
        print("❌ 连接失败！可能是网络、账号或权限问题。")
        print(f"   错误信息: {e}")
        print("\n💡 常见原因：")
        print("   1. 外网地址未开启（请在 RDS 控制台开启）")
        print("   2. 白名单未添加你的公网 IP（如 123.123.123.123/32）")
        print("   3. 用户名或密码错误")
        print("   4. 数据库实例还在创建中（等待 5-10 分钟）")
        return False

    except psycopg2.ProgrammingError as e:
        print("❌ 数据库配置错误：")
        print(f"   {e}")
        print("   可能是数据库名不存在或权限不足")
        return False

    except Exception as e:
        print(f"❌ 未知错误: {e}")
        return False

    finally:
        if conn:
            conn.close()
        print("\n✅ 测试完成。")

if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)