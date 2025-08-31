import os
import asyncio
from google.adk.agents import Agent
from google.adk.models.lite_llm import LiteLlm
from google.adk.runners import Runner
from google.adk.sessions import DatabaseSessionService
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.genai import types 
from dotenv import load_dotenv
load_dotenv(override=True)

# 配置
DS_API_KEY = os.getenv("DS_API_KEY")
DS_BASE_URL = os.getenv("DS_BASE_URL")
APP_NAME = "persistent_chat_app"
USER_ID = "user_1"

# 数据库配置
DB_CONFIG = {
    'host': 'localhost', # 数据库地址
    'port': 5432, # 数据库端口
    'database': 'adk', # 数据库名称
    'user': 'postgres', # 数据库用户名
    'password': 'snowball2019' # 数据库密码
}

# 构建数据库URL
DATABASE_URL = f"postgresql://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}"

# 创建模型和 Agent
model = LiteLlm(
    model="deepseek/deepseek-chat",  
    api_base=DS_BASE_URL,
    api_key=DS_API_KEY
)

agent = Agent(
    name="persistent_chatbot",
    model=model,
    instruction="你是一个乐于助人的中文助手。你的对话记录会永久保存在数据库中。",
    description="回答用户的问题，支持持久化存储会话历史。"
)

async def create_or_get_session(runner, user_id, session_id=None):
    """创建新会话或获取已有会话，返回实际的 session_id"""
    if session_id:
        # 如果指定了 session_id，先尝试获取
        session = await runner.session_service.get_session(
            app_name=runner.app_name,
            user_id=user_id,
            session_id=session_id
        )
        
        if session:
            print(f"📋 使用数据库中已存在的 Session: {session_id}")
            print(f"📊 会话包含 {len(session.events)} 条历史事件")
            return session_id
        else:
            print(f"🔧 Session {session_id} 不存在，创建新会话...")
    else:
        print(f"🔧 自动创建新会话...")
    
    # 创建新会话（如果 session_id 为 None，会自动生成）
    new_session = await runner.session_service.create_session(
        app_name=runner.app_name,
        user_id=user_id,
        session_id=session_id  # 可以是 None 或指定值
    )
    
    print(f"✅ 会话创建成功并保存到数据库，Session ID: {new_session.id}")
    return new_session.id  # 返回实际的 session_id

async def call_agent_async(query: str, runner, user_id, session_id):
    """发送查询到代理并打印最终响应。"""

    print(f"\n>>> 用户问题: {query}")
    print(f"\n>>> 代理响应: ", end="", flush=True)

    # 将用户的问题转换为 ADK 格式
    content = types.Content(role='user', parts=[types.Part(text=query)])

    # 配置流式模式
    run_config = RunConfig(streaming_mode=StreamingMode.SSE)
    
    # 用于累积文本，避免重复输出
    accumulated_text = ""

    # 关键概念：run_async 执行 Agent 逻辑并生成事件
    async for event in runner.run_async(user_id=user_id, session_id=session_id, new_message=content, run_config=run_config):    
        if event.content and event.content.parts and event.content.parts[0].text:
            current_text = event.content.parts[0].text
            if event.partial:
                # 流式片段（partial=True）: 不完整的文本块，更多文本将跟随
                if current_text.startswith(accumulated_text):
                    # 只输出新增的部分
                    delta_text = current_text[len(accumulated_text):]
                    if delta_text:
                        print(delta_text, end="", flush=True)
                        accumulated_text = current_text
                else:
                    # 异常处理：如果不是增量，直接输出（这种情况很少见）
                    print(current_text, end="", flush=True)
                    accumulated_text += current_text
            else:
                # 完整文本块（partial=False）: 这部分内容已完成
                if current_text.startswith(accumulated_text):
                    # 输出剩余的文本
                    remaining_text = current_text[len(accumulated_text):]
                    if remaining_text:
                        print(remaining_text, end="", flush=True)
                elif not accumulated_text:
                    # 如果没有累积文本，直接输出完整文本
                    print(current_text, end="", flush=True)
                
                # 检查是否是真正的最终响应
                if hasattr(event, 'turn_complete') and event.turn_complete:
                    break
                elif not event.partial and (not hasattr(event, 'turn_complete') or event.turn_complete is None):
                    break

async def list_existing_sessions(session_service, user_id):
    """列出用户的所有会话"""
    try:
        sessions_response = await session_service.list_sessions(
            app_name=APP_NAME,
            user_id=user_id
        )
        
        if sessions_response.sessions:
            print(f"\n📚 发现 {len(sessions_response.sessions)} 个已存在的会话:")
            for i, session in enumerate(sessions_response.sessions, 1):
                print(f"   {i}. Session ID: {session.id}")
            return [session.id for session in sessions_response.sessions]
        else:
            print(f"\n📭 没有找到已存在的会话")
            return []
            
    except Exception as e:
        print(f"\n❌ 获取会话列表失败: {e}")
        return []

async def interactive_chat():
    """使用 DatabaseSessionService 的交互式聊天循环"""
    print("🤖 欢迎使用 ADK 智能助手！(数据库持久化版本)")
    print("💾 所有对话记录将保存到 PostgreSQL 数据库")
    print("💡 输入 'quit', 'exit', '退出' 或 'q' 来结束对话")
    print("💡 输入 'list' 查看所有会话")
    print("💡 输入 'delete <session_id>' 删除指定会话")
    print("=" * 60)
    
    try:
        # 创建 DatabaseSessionService
        print(f"🔗 正在连接数据库...")
        session_service = DatabaseSessionService(DATABASE_URL)
        print(f"✅ 数据库连接成功！")
        
        # 创建 Runner
        runner = Runner(
            agent=agent,
            app_name=APP_NAME,
            session_service=session_service,
        )
        
        # 列出已存在的会话
        existing_sessions = await list_existing_sessions(session_service, USER_ID)
        
        # 让用户选择会话
        actual_session_id = None
        if existing_sessions:
            user_choice = input(f"\n🤔 选择操作:\n  1. 创建新会话\n  2. 使用已存在的会话\n请输入选择 (1/2): ").strip()
            
            if user_choice == "2":
                session_choice = input(f"请输入要使用的 Session ID: ").strip()
                if session_choice in existing_sessions:
                    actual_session_id = await create_or_get_session(runner, USER_ID, session_choice)
                else:
                    print(f"⚠️ Session ID {session_choice} 不存在，将创建新会话")
                    actual_session_id = await create_or_get_session(runner, USER_ID)
            else:
                actual_session_id = await create_or_get_session(runner, USER_ID)
        else:
            actual_session_id = await create_or_get_session(runner, USER_ID)
        
        conversation_count = 0
        
        while True:
            try:
                # 获取用户输入
                user_input = input("\n🙋 请输入您的问题: ").strip()
                
                # 检查退出命令
                if user_input.lower() in ['quit', 'exit', '退出', 'q', '']:
                    print("\n👋 感谢使用，会话已保存到数据库！")
                    break
                
                # 特殊命令处理
                if user_input.lower() == 'list':
                    await list_existing_sessions(session_service, USER_ID)
                    continue
                
                if user_input.lower().startswith('delete '):
                    session_to_delete = user_input[7:].strip()
                    try:
                        await session_service.delete_session(
                            app_name=APP_NAME,
                            user_id=USER_ID,
                            session_id=session_to_delete
                        )
                        print(f"✅ 会话 {session_to_delete} 已从数据库删除")
                    except Exception as e:
                        print(f"❌ 删除会话失败: {e}")
                    continue
                
                # 显式打印对话轮数
                conversation_count += 1
                print(f"\n--- 第 {conversation_count} 轮对话 (DB Session: {actual_session_id}) ---")
                
                # 调用 Agent 处理用户输入
                await call_agent_async(user_input, runner, USER_ID, actual_session_id)
                
                # 显示会话信息
                print(f"\n📊 会话信息: Session ID = {actual_session_id}, 对话轮数 = {conversation_count}")
                print(f"💾 对话已自动保存到数据库")
                
            except KeyboardInterrupt:
                print("\n\n👋 用户中断，会话已保存到数据库")
                break
            except Exception as e:
                print(f"\n❌ 发生错误: {e}")
                print("请重试或输入 'quit' 退出")
                
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        print("请检查：")
        print("  1. PostgreSQL 服务是否启动")
        print("  2. 数据库配置是否正确")
        print("  3. 网络连接是否正常")
        print("  4. 是否安装了 psycopg2-binary")

async def main():
    # 启动数据库持久化版本的交互式聊天
    await interactive_chat()

if __name__ == "__main__":
    print("🚀 启动数据库持久化 ADK 聊天助手")
    print(f"🔗 数据库: {DATABASE_URL.replace(DB_CONFIG['password'], '***')}")
    asyncio.run(main()) 