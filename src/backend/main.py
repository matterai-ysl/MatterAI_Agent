"""
google-adk-version: 1.8.0
"""
from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm
from google.adk.runners import Runner
from google.adk.sessions import DatabaseSessionService
from google.genai import types 
from google.adk.agents.run_config import RunConfig, StreamingMode
import asyncio
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset
from google.adk.tools.openapi_tool.auth.auth_helpers import token_to_scheme_credential
from google.adk.tools.mcp_tool.mcp_session_manager import SseConnectionParams,StreamableHTTPServerParams
from fastapi import FastAPI, HTTPException, Query
# 文件上传相关导入已移除，现使用外部服务
# from fastapi import UploadFile, File, Request
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
# 静态文件服务已移除，文件现由外部服务处理
# from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional, AsyncGenerator, Any, Dict
import json
import uuid
import time
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os
# 从Config文件导入预设工具配置
import sys
sys.path.append('.')
from importlib import import_module
config_module = import_module('Config')  # 注意文件名带空格
PRESET_TOOLS_CONFIG = config_module.PRESET_TOOLS_CONFIG
MINDS_TOOLS_CONFIG = config_module.MINDS_TOOLS_CONFIG
AGENT_CONFIGS = config_module.AGENT_CONFIGS
# 导入认证相关模块
from auth_api.auth_routes import router as auth_router, get_current_user
from database import db_manager
from auth_api.email_service import start_cleanup_task
from fastapi.security import HTTPBearer
from fastapi import Depends
load_dotenv(override=True)


APP_NAME = "chatbot"
# 移除硬编码的用户ID，现在从JWT token获取
# USER_ID = "user_1"  # 已弃用
SESSION_ID = "session_1"

# HTTP Bearer token scheme
security = HTTPBearer()

async def get_current_user_id(current_user: dict = Depends(get_current_user)) -> str:
    """从JWT token获取当前用户ID"""
    return current_user.get("id") or current_user.get("sub", "anonymous")

# 配置模型
model = LiteLlm(
    model="openai/gpt-4o",  
    api_base=os.getenv("BASE_URL"),
    api_key=os.getenv("OPENAI_API_KEY")
)

# 数据库配置
DB_CONFIG = {
    'host': os.getenv("DB_HOST"), # 数据库地址
    'port': 5432, # 数据库端口
    'database': os.getenv("DB_NAME"), # 数据库名称
    'user': os.getenv("DB_USER"), # 数据库用户名
    'password': os.getenv("DB_PASSWORD") # 数据库密码
}

# 构建数据库URL
DATABASE_URL = f"postgresql://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}"


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
    # new_session.state.update({
    #     "user_id": user_id
    # })
    
    print(f"✅ 会话创建成功并保存到数据库，Session ID: {new_session.id}")
    return new_session.id  # 返回实际的 session_id
async def list_existing_sessions(session_service, user_id, app_name: str):
    """列出用户在指定 app 下的所有会话"""
    try:
        full_app_name = f"{APP_NAME}_{app_name}"
        sessions_response = await session_service.list_sessions(
            app_name=full_app_name,
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

############################
# MCP 工具与 Agent 定义
############################


def create_mcp_tool_from_config(tool_config,user_id):
    """根据配置创建MCP工具"""
    print(f"🔧 创建MCP工具: {tool_config}")
    if user_id:
        # 使用 ADK 官方推荐的方式创建 API Key 认证
        auth_scheme, auth_credential = token_to_scheme_credential(
            "apikey",           # token_type: API Key 类型
            "header",            # location: 查询参数位置
            "user_id",              # name: 参数名
            user_id        # credential_value: API Key 值
        )
        
    else:
        auth_scheme = None
        auth_credential = None
    try:
        if tool_config["transport"] == "http":
            connection_params = StreamableHTTPServerParams(
                url=tool_config["url"],
                timeout=10,  # 减少超时时间
                sse_read_timeout=1200,  # 减少SSE读取超时
                terminate_on_close=True
            )
            return MCPToolset(
                connection_params=connection_params,
                auth_scheme=auth_scheme,
                auth_credential=auth_credential
            )



        elif tool_config["transport"] == "sse":
            connection_params = SseConnectionParams(
                url=tool_config["url"],
                timeout=10,  # 减少超时时间
                sse_read_timeout=1200  # 减少SSE读取超时
            )
            return MCPToolset(
                connection_params=connection_params,
                auth_scheme=auth_scheme,
                auth_credential=auth_credential
            )
        # 可以扩展支持其他传输方式
        return None
    except Exception as e:
        print(f"❌ 创建工具失败 {tool_config['url']}: {str(e)}")
        return None

def get_session_config_key(selected_tools, custom_tools, app_name="default"):
    """生成会话工具配置的唯一键"""
    selected_key = tuple(sorted(selected_tools)) if selected_tools else ()
    custom_key = tuple((tool.url, tool.transport) for tool in custom_tools) if custom_tools else ()
    return (selected_key, custom_key, app_name)

def configs_match(config1, config2):
    """检查两个配置是否匹配"""
    return config1 == config2

async def get_or_create_session_agent(user_id: str, session_id: str, selected_tools=None, custom_tools=None, app_name="default") -> Runner:
    """获取或创建会话级智能体"""
    global session_agents, session_agent_configs, session_last_access
    
    # 生成包含用户ID的会话键
    session_key = f"{user_id}:{session_id}"
    
    # 🕒 更新最后访问时间
    session_last_access[session_key] = time.time()
    
    # 生成当前请求的配置键
    current_config = get_session_config_key(selected_tools, custom_tools, app_name)
    
    # 检查是否已有该会话的智能体且配置匹配
    if session_key in session_agents and session_key in session_agent_configs:
        cached_config = session_agent_configs[session_key]
        if configs_match(cached_config, current_config):
            print(f"♻️ 复用用户 {user_id} 会话 {session_id} 的已有智能体")
            return session_agents[session_key]
        else:
            print(f"🔄 用户 {user_id} 会话 {session_id} 的工具配置已变更，需要创建新智能体")
            # 关闭旧的智能体
            old_runner = session_agents[session_key]
            try:
                await old_runner.close()
                print(f"✅ 已关闭用户 {user_id} 会话 {session_id} 的旧智能体")
            except Exception as e:
                print(f"⚠️ 关闭旧智能体时出错: {str(e)}")
    
    # 创建新的智能体
    print(f"🔧 为用户 {user_id} 会话 {session_id} 创建新智能体 (应用: {app_name})...")
    dynamic_agent = create_dynamic_agent(selected_tools, custom_tools, app_name,user_id)
    new_runner = Runner(agent=dynamic_agent, app_name=f"{APP_NAME}_{app_name}", session_service=session_service)  # type: ignore
    
    # 缓存新智能体和配置
    session_agents[session_key] = new_runner
    session_agent_configs[session_key] = current_config
    
    print(f"✅ 用户 {user_id} 会话 {session_id} 的新智能体创建完成并已缓存")
    return new_runner

def create_dynamic_agent(selected_tools=None, custom_tools=None, app_name="default",user_id=None):
    """根据选中的工具动态创建智能体"""
    tools = []  # 开始时为空工具列表
    
    # 根据应用名称选择工具配置
    agent_config = AGENT_CONFIGS.get(app_name, AGENT_CONFIGS["default"])
    tools_config = agent_config["tools_config"]
    system_prompt = agent_config["system_prompt"]
    
    if selected_tools:
        print(f"🔧 正在为应用 {app_name} 加载选中的工具: {selected_tools}")
        
        for tool_id in selected_tools:
            if tool_id.startswith("preset-"):
                # 预设工具 - 优先从当前应用的工具配置查找
                if tool_id in tools_config:
                    config = tools_config[tool_id]
                    tool = create_mcp_tool_from_config(config,user_id)
                    if tool:
                        tools.append(tool)  # type: ignore
                        print(f"✅ 加载应用 {app_name} 的预设工具: {config['name']}")
                    else:
                        print(f"❌ 应用 {app_name} 的预设工具加载失败: {config['name']}")
                # 如果当前应用没有，再从通用配置查找
                elif tool_id in PRESET_TOOLS_CONFIG:
                    config = PRESET_TOOLS_CONFIG[tool_id]
                    tool = create_mcp_tool_from_config(config,user_id)
                    if tool:
                        tools.append(tool)  # type: ignore
                        print(f"✅ 加载通用预设工具: {config['name']}")
                    else:
                        print(f"❌ 通用预设工具加载失败: {config['name']}")
                else:
                    print(f"⚠️ 工具 {tool_id} 在应用 {app_name} 中未找到配置")
            elif tool_id.startswith("custom-"):
                # 自定义工具 - 通过索引从 custom_tools 参数中获取
                if custom_tools:
                    try:
                        # 提取索引，例如 "custom-1756739609463" -> 使用在selected_tools中的位置
                        # 更简单的方法：计算当前是第几个自定义工具
                        custom_count = sum(1 for tid in selected_tools[:selected_tools.index(tool_id) + 1] if tid.startswith("custom-"))
                        index = custom_count - 1  # 转为0基索引
                        
                        if 0 <= index < len(custom_tools):
                            custom_tool = custom_tools[index]
                            # 直接使用转换后的字段
                            url = getattr(custom_tool, 'url', None)
                            transport = getattr(custom_tool, 'transport', None)
                            
                            if url and transport:
                                custom_config = {
                                    "url": url,
                                    "transport": transport
                                }
                                tool = create_mcp_tool_from_config(custom_config,user_id)
                                if tool:
                                    tools.append(tool)  # type: ignore
                                    print(f"✅ 加载自定义工具: {url} ({transport})")
                                else:
                                    print(f"❌ 自定义工具加载失败: {url}")
                            else:
                                print(f"❌ 自定义工具缺少必要字段: url={url}, transport={transport}")
                        else:
                            print(f"❌ 自定义工具索引超出范围: {index} (总数: {len(custom_tools)})")
                    except Exception as e:
                        print(f"❌ 自定义工具处理异常: {str(e)}")
                else:
                    print(f"❌ 未提供自定义工具配置列表，跳过: {tool_id}")
    
    # 创建Agent
    agent = LlmAgent(
        name=f"{app_name}_agent",
        model=model,
        instruction=system_prompt,
        tools=tools,  # type: ignore
    )
    
    print(f"🤖 智能体创建完成，共加载 {len(tools)} 个工具")
    return agent


############################
# 新增：自动清理功能
############################

# 会话最后访问时间记录
session_last_access: Dict[str, float] = {}

# 正在进行的会话（防止清理正在使用的智能体）
active_sessions: set = set()

# 配置：30分钟超时
SESSION_TIMEOUT = 30 * 60  # 30分钟

async def cleanup_expired_sessions():
    """清理过期的会话智能体"""
    global session_agents, session_agent_configs, session_last_access
    
    current_time = time.time()
    expired_sessions = []
    
    # 找出过期的会话
    for session_key, last_access in session_last_access.items():
        # 从session_key中提取实际的session_id用于检查活跃状态
        if ":" in session_key:
            _, session_id = session_key.split(":", 1)  # user_id 不需要使用
        else:
            session_id = session_key  # 兼容旧格式
            
        # 跳过正在活跃的会话
        if session_id in active_sessions:
            print(f"⏭️ 跳过正在使用的会话: {session_key}")
            continue
            
        if current_time - last_access > SESSION_TIMEOUT:
            expired_sessions.append(session_key)
    
    # 清理过期会话
    cleaned_count = 0
    for session_key in expired_sessions:
        if session_key in session_agents:
            try:
                runner = session_agents[session_key]
                await runner.close()
                
                # 从缓存中移除
                del session_agents[session_key]
                if session_key in session_agent_configs:
                    del session_agent_configs[session_key]
                del session_last_access[session_key]
                
                cleaned_count += 1
                print(f"🧹 清理过期会话: {session_key} (空闲时间: {(current_time - last_access)/60:.1f}分钟)")
                
            except Exception as e:
                print(f"⚠️ 清理会话 {session_key} 时出错: {str(e)}")
    
    if cleaned_count > 0:
        print(f"✅ 自动清理完成，共清理了 {cleaned_count} 个过期智能体")
    
    return cleaned_count

async def periodic_cleanup_task():
    """定期清理任务"""
    while True:
        try:
            await asyncio.sleep(10 * 60)  # 每10分钟检查一次
            print("🔍 开始定期检查过期会话...")
            
            if session_agents:
                print(f"📊 当前缓存的智能体数量: {len(session_agents)}")
                cleaned = await cleanup_expired_sessions()
                if cleaned == 0:
                    print("✅ 没有过期的会话需要清理")
            else:
                print("📊 当前没有缓存的智能体")
                
        except Exception as e:
            print(f"❌ 定期清理任务异常: {str(e)}")

# 全局清理任务引用
cleanup_task: Optional[asyncio.Task] = None

############################
# FastAPI 应用
############################

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
# 运行资源
runner: Optional[Runner] = None
session_service: Optional[DatabaseSessionService] = None

# 会话级智能体缓存 (键格式: "user_id:session_id")
session_agents: Dict[str, Runner] = {}
session_agent_configs: Dict[str, Any] = {}  # 存储每个会话的工具配置

@asynccontextmanager
async def lifespan(_app: FastAPI):  # app 参数不使用，改名避免警告
    global runner, session_service, cleanup_task
    # 启动时执行
    print("🔄 启动 FastAPI 应用生命周期...")
    try:
        print("🔗 正在初始化数据库服务...")
        session_service = DatabaseSessionService(DATABASE_URL)
        print("✅ 数据库服务初始化成功")
        
        print("🔗 正在初始化用户认证数据库...")
        await db_manager.initialize()
        print("✅ 用户认证数据库初始化成功")
        
        # 🚀 启动定期清理任务
        print("🚀 启动智能体自动清理任务...")
        cleanup_task = asyncio.create_task(periodic_cleanup_task())
        print("✅ 自动清理任务已启动 (30分钟超时，每10分钟检查一次)")
        
        # 🚀 启动邮件验证码清理任务
        print("🚀 启动邮件验证码清理任务...")
        start_cleanup_task()
        print("✅ 邮件验证码清理任务已启动")
        
        print(f"📊 当前 session_service 状态: {session_service is not None}")
    except Exception as e:
        print(f"❌ 服务初始化失败: {e}")
        raise e
    
    yield {"session_service": session_service}
    
    # 关闭时执行
    print("🔄 关闭 FastAPI 应用...")
    try:
        # 🛑 停止定期清理任务
        if cleanup_task and not cleanup_task.done():
            print("🛑 停止自动清理任务...")
            cleanup_task.cancel()
            try:
                await cleanup_task
            except asyncio.CancelledError:
                print("✅ 自动清理任务已停止")
        
    except Exception as e:
        print(f"⚠️ 关闭时出错: {str(e)}")
    finally:
        # 关闭所有会话缓存的智能体
        global session_agents, session_agent_configs, session_last_access
        if session_agents:
            print(f"🧹 清理 {len(session_agents)} 个会话缓存的智能体...")
            for session_id, session_runner in session_agents.items():
                try:
                    await session_runner.close()
                    print(f"✅ 会话 {session_id} 的智能体已关闭")
                except Exception as e:
                    print(f"⚠️ 关闭会话 {session_id} 智能体时出错: {str(e)}")
            session_agents.clear()
            session_agent_configs.clear()
            session_last_access.clear()
        
        # 关闭主Runner
        if runner is not None:
            try:
                await runner.close()
                print("✅ 主Runner已关闭")
            except Exception as e:
                print(f"⚠️ 关闭主Runner时出错: {str(e)}")
        
        # 关闭用户认证数据库
        try:
            await db_manager.close()
            print("✅ 用户认证数据库已关闭")
        except Exception as e:
            print(f"⚠️ 关闭用户认证数据库时出错: {str(e)}")

app = FastAPI(title="MatterAI Agent API", version="0.1.0", lifespan=lifespan)

# CORS（根据需要收敛域名）
#本地调试开启跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册认证路由
app.include_router(auth_router)

# 静态文件（上传文件访问）- 已迁移到公网服务器
# app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

class CustomToolConfig(BaseModel):
    """自定义工具配置"""
    url: str
    transport: str  # "http" 或 "sse"

class ChatRequest(BaseModel):
    # user_id 现在从JWT token中获取，不再从请求体传入
    query: str
    session_id: Optional[str] = None
    selected_tools: Optional[List[str]] = None
    custom_tools: Optional[List[CustomToolConfig]] = None
    app_name: Optional[str] = "default"  # 智能体应用名称
    file_urls: Optional[List[str]] = None  # 文件地址列表
    language: Optional[str] = "zh"  # 语言设置，默认中文


def _get_file_upload_text(file_urls: List[str], language: str = "zh") -> str:
    """根据语言生成文件上传信息文本"""
    file_count = len(file_urls)
    
    if language == "en":
        file_info = f"\n\nUploaded files ({file_count}):\n"
        for i, url in enumerate(file_urls, 1):
            file_name = url.split('/')[-1] if '/' in url else url
            file_info += f"{i}. {file_name} ({url})\n"
    else:  # 默认中文
        file_info = f"\n\n已上传文件({file_count}个):\n"
        for i, url in enumerate(file_urls, 1):
            file_name = url.split('/')[-1] if '/' in url else url
            file_info += f"{i}. {file_name} ({url})\n"
    
    return file_info

def _sse_pack(payload: Dict[str, Any]) -> str:
    """安全的 SSE 数据包装函数，处理不可序列化的对象"""
    try:
        # 尝试直接序列化
        serialized = json.dumps(payload, ensure_ascii=False)
        return f"data: {serialized}\n\n"
    except (TypeError, ValueError):
        # 如果序列化失败，递归处理不可序列化的对象
        safe_payload = _make_json_safe(payload)
        serialized = json.dumps(safe_payload, ensure_ascii=False)
        return f"data: {serialized}\n\n"

def _make_json_safe(obj: Any) -> Any:
    """递归处理对象，确保可以JSON序列化"""
    if obj is None or isinstance(obj, (str, int, float, bool)):
        return obj
    elif isinstance(obj, dict):
        return {k: _make_json_safe(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [_make_json_safe(item) for item in obj]
    else:
        # 对于不可序列化的对象，转换为字符串
        try:
            # 尝试获取对象的有用信息
            if hasattr(obj, '__dict__'):
                return _make_json_safe(obj.__dict__)
            else:
                return str(obj)
        except Exception:
            return f"<{type(obj).__name__} object>"


@app.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "ok"}

# 🆕 新增：手动清理接口
@app.post("/cleanup")
async def manual_cleanup() -> Dict[str, Any]:
    """手动清理过期智能体的接口"""
    print("🧹 收到手动清理请求...")
    try:
        cleaned = await cleanup_expired_sessions()
        cache_info = {
            "current_sessions": len(session_agents),
            "cleaned_sessions": cleaned,
            "active_sessions": len(active_sessions),
            "total_tracked": len(session_last_access)
        }
        print(f"✅ 手动清理完成: {cache_info}")
        return {
            "status": "success",
            "message": f"手动清理完成，清理了 {cleaned} 个过期智能体",
            "cache_info": cache_info
        }
    except Exception as e:
        print(f"❌ 手动清理失败: {str(e)}")
        return {
            "status": "error",
            "message": f"手动清理失败: {str(e)}"
        }

# 🆕 新增：缓存状态查询接口
@app.get("/cache-status")
async def get_cache_status() -> Dict[str, Any]:
    """获取智能体缓存状态"""
    current_time = time.time()
    
    # 计算每个会话的空闲时间
    session_info = []
    for session_key, last_access in session_last_access.items():
        # 从session_key中提取实际的session_id用于检查活跃状态
        if ":" in session_key:
            _, session_id = session_key.split(":", 1)  # user_id 不需要使用
        else:
            session_id = session_key  # 兼容旧格式
            
        idle_minutes = (current_time - last_access) / 60
        session_info.append({
            "session_key": session_key,
            "session_id": session_id,
            "idle_minutes": round(idle_minutes, 1),
            "is_active": session_id in active_sessions,
            "will_expire_in": max(0, (SESSION_TIMEOUT - (current_time - last_access)) / 60)
        })
    
    # 按空闲时间排序
    session_info.sort(key=lambda x: x['idle_minutes'], reverse=True)
    
    return {
        "total_cached_agents": len(session_agents),
        "total_tracked_sessions": len(session_last_access),
        "active_sessions": len(active_sessions),
        "timeout_minutes": SESSION_TIMEOUT / 60,
        "sessions": session_info
    }


@app.get("/sessions")
async def list_sessions(user_id: str = Depends(get_current_user_id), app_name: str = Query("default", description="应用名称")) -> Dict[str, List[str]]:
    print(f"📋 收到获取会话列表请求 - user_id: {user_id}, app_name: {app_name}")
    print(f"📊 session_service 状态: {session_service is not None}")
    
    if session_service is None:
        print("❌ session_service 未初始化")
        raise HTTPException(status_code=503, detail="Service not ready")
    
    try:
        ids = await list_existing_sessions(session_service, user_id, app_name)
        print(f"✅ 成功获取会话列表: {ids}")
        return {"sessions": ids}
    except Exception as e:
        print(f"❌ 获取会话列表失败: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get sessions: {str(e)}")


@app.get("/history")
async def get_history(user_id: str = Depends(get_current_user_id), session_id: str = Query(...), app_name: str = Query("default")) -> JSONResponse:
    if session_service is None:
        raise HTTPException(status_code=503, detail="Service not ready")
    full_app_name = f"{APP_NAME}_{app_name}"
    session = await session_service.get_session(app_name=full_app_name, user_id=user_id, session_id=session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    def process_events(events):
        """处理事件，将相关的事件合并为完整的消息"""
        messages = []
        current_user_message = None
        current_assistant_message = None
        
        for evt in events:
            # 优先从 content.role 获取角色，兜底使用 evt.role
            content = getattr(evt, 'content', None)
            if content and hasattr(content, 'role'):
                role = content.role
            else:
                role = getattr(evt, 'role', None)
            
            # 规范化角色名称
            if role == 'model':
                role = 'assistant'
            
            # 获取事件时间戳
            evt_timestamp = None
            if hasattr(evt, 'timestamp'):
                evt_timestamp = int(evt.timestamp * 1000) if isinstance(evt.timestamp, float) else int(evt.timestamp)
            elif hasattr(evt, 'created_at'):
                evt_timestamp = int(evt.created_at * 1000) if isinstance(evt.created_at, float) else int(evt.created_at)
            
            if not evt_timestamp:
                evt_timestamp = int(time.time() * 1000)
            
            # 检查事件类型（用于调试）
            # has_function_call = False
            has_function_response = False
            # has_text = False
            
            if content and getattr(content, 'parts', None):
                for part in content.parts:
                    # if hasattr(part, 'function_call') and part.function_call:
                    #     has_function_call = True
                    if hasattr(part, 'function_response') and part.function_response:
                        has_function_response = True
                    # if hasattr(part, 'text') and part.text and part.text.strip():
                    #     has_text = True
            
            #print(f"🔍 处理事件: role={role}, 工具调用={has_function_call}, 工具结果={has_function_response}, 文本={has_text}, timestamp={evt_timestamp}")
            
            # 工具结果虽然可能标记为 'user'，但应该归属到助手消息中
            if has_function_response:
                role = 'assistant'
                #print(f"🔧 工具结果强制归属到助手消息")
            
            # 处理用户消息
            if role == 'user':
                # 保存之前的助手消息
                if current_assistant_message and (current_assistant_message.get("content") or 
                                                   current_assistant_message.get("toolCalls") or 
                                                   current_assistant_message.get("toolResults")):
                    messages.append(current_assistant_message)
                    current_assistant_message = None
                
                # 创建或更新用户消息
                if not current_user_message:
                    current_user_message = {
                        "role": "user",
                        "content": [],
                        "toolCalls": [],
                        "toolResults": [],
                        "timestamp": evt_timestamp
                    }
                
                # 处理用户文本内容
                if content and getattr(content, 'parts', None):
                    for part in content.parts:
                        text = getattr(part, 'text', None)
                        if text and text.strip():
                            current_user_message["content"].append({"type": "text", "text": text})
            
            # 处理助手消息
            elif role == 'assistant':
                # 保存之前的用户消息
                if current_user_message and current_user_message.get("content"):
                    messages.append(current_user_message)
                    current_user_message = None
                
                # 创建或更新助手消息
                if not current_assistant_message:
                    current_assistant_message = {
                        "role": "assistant",
                        "content": [],
                        "toolCalls": [],
                        "toolResults": [],
                        "timestamp": evt_timestamp
                    }
                
                # 处理助手文本内容
                if content and getattr(content, 'parts', None):
                    for part in content.parts:
                        text = getattr(part, 'text', None)
                        if text and text.strip():
                            current_assistant_message["content"].append({"type": "text", "text": text})
                
                # 处理工具调用
                if hasattr(evt, 'get_function_calls'):
                    calls = evt.get_function_calls()
                    if calls:
                        for call in calls:
                            tool_call = {
                                "id": f"call_{getattr(call, 'id', f'{getattr(call, 'name', 'unknown')}_{evt_timestamp}')}",
                                "name": getattr(call, 'name', 'unknown'),
                                "args": getattr(call, 'args', {}),
                                "timestamp": evt_timestamp
                            }
                            current_assistant_message["toolCalls"].append(tool_call)
                            print(f"🔧 添加工具调用: {tool_call['name']}")
                
                # 处理工具结果
                if hasattr(evt, 'get_function_responses'):
                    responses = evt.get_function_responses()
                    if responses:
                        for resp in responses:
                            tool_result = {
                                "id": f"result_{getattr(resp, 'id', f'{getattr(resp, 'name', 'unknown')}_{evt_timestamp}')}",
                                "name": getattr(resp, 'name', 'unknown'),
                                "result": getattr(resp, 'response', None),
                                "timestamp": evt_timestamp
                            }
                            current_assistant_message["toolResults"].append(tool_result)
                            print(f"📋 添加工具结果: {tool_result['name']}")
        
        # 添加剩余的消息
        if current_user_message and current_user_message.get("content"):
            messages.append(current_user_message)
        
        if current_assistant_message and (current_assistant_message.get("content") or 
                                           current_assistant_message.get("toolCalls") or 
                                           current_assistant_message.get("toolResults")):
            messages.append(current_assistant_message)
        
        #print(f"📝 处理完成，生成了 {len(messages)} 条消息")
        #for i, msg in enumerate(messages):
            #print(f"  {i+1}. {msg['role']}: 内容={len(msg.get('content', []))} 工具调用={len(msg.get('toolCalls', []))} 工具结果={len(msg.get('toolResults', []))}")
        
        return messages

    events = getattr(session, 'events', [])
    messages = process_events(events)
    # return JSONResponse({"session_id": session.id, "messages": messages})
    return {"session_id": session.id, "messages": messages} # type: ignore

@app.post("/chat/stream")
async def chat_stream(payload: ChatRequest, user_id: str = Depends(get_current_user_id)) -> StreamingResponse:
    print(f"💬 收到流式聊天请求:")
    print(f"   认证用户ID: {user_id}")
    print(f"   查询: {payload.query}")
    print(f"   会话ID: {payload.session_id}")
    print(f"   应用名称: {payload.app_name}")
    print(f"   选中工具: {payload.selected_tools}")
    print(f"   自定义工具: {payload.custom_tools}")
    print(f"   文件地址: {payload.file_urls}")
    print(f"   app: {payload.app_name}")
    
    # 确定实际的会话ID（如果没有则生成一个）
    actual_session_id = payload.session_id or str(uuid.uuid4())
    # 始终按 app_name 和工具配置获取/创建"会话级智能体"
    print("🔧 获取或创建会话级智能体（允许无工具）...")
    local_runner = await get_or_create_session_agent(
        user_id,  # 使用认证的用户ID
        actual_session_id,
        payload.selected_tools,
        payload.custom_tools,
        payload.app_name or "default"
    )
        # 只设置必要的用户信息
    # session.state.update({
    #     "user_id": user_id,
    #     "user_email": current_user.get("email"),
    #     "user_permissions": current_user.get("permissions", [])
    # })
    # user_id 已经是认证的用户ID，无需从payload获取
    requested_session_id = payload.session_id
    query_text = payload.query

    async def event_gen() -> AsyncGenerator[str, None]:
        should_close_runner = False
        try:
            print(f"🔄 开始处理流式响应...")
            
            # 这里始终使用会话级智能体，无需在结束时清理
            should_close_runner = False
            
            # 确保会话存在
            print(f"🔄 创建或获取会话...")
            final_session_id = await create_or_get_session(local_runner, user_id, requested_session_id)
            print(f"✅ 会话ID: {final_session_id}")
            
            # 🆕 标记会话为活跃状态
            active_sessions.add(final_session_id)
            
            # 先下发 meta，会话ID供前端保存
            meta_data = {"type": "meta", "session_id": final_session_id}
            print(f"📤 发送meta数据: {meta_data}")
            yield _sse_pack(meta_data)

            # 构建消息内容，包含文本和文件
            parts = []
            if query_text.strip():
                parts.append(types.Part(text=query_text))
            
            # 添加文件信息到消息中（作为文本描述）
            if payload.file_urls:
                file_info = _get_file_upload_text(payload.file_urls, payload.language or "zh")
                parts.append(types.Part(text=file_info))
                print(f"📎 包含文件信息: {len(payload.file_urls)}个文件")
                
            content = types.Content(role='user', parts=parts)
            run_config = RunConfig(streaming_mode=StreamingMode.SSE)
            accumulated_text = ""
            
            print(f"🤖 开始与Agent交互...")
            event_count = 0

            async for event in local_runner.run_async(user_id=user_id, session_id=final_session_id, new_message=content, run_config=run_config):
                event_count += 1
                #print(f"📨 收到事件 #{event_count}: {type(event).__name__}")
                
                # 工具调用提示
                if hasattr(event, 'get_function_calls') and event.get_function_calls():
                    calls = event.get_function_calls()
                    print(f"🔧 工具调用数量: {len(calls)}")
                    for _, call in enumerate(calls):  # i 变量不使用
                        call_data = {
                            "type": "tool_call",
                            "name": getattr(call, 'name', 'unknown'),
                            "args": getattr(call, 'args', {}),
                        }
                        #print(f"📤 发送工具调用 #{i+1}: {call_data}")
                        yield _sse_pack(call_data)

                # 工具结果
                if hasattr(event, 'get_function_responses') and event.get_function_responses():
                    responses = event.get_function_responses()
                    print(f"📋 工具结果数量: {len(responses)}")
                    for _, resp in enumerate(responses):  # i 变量不使用
                        result_data = {
                            "type": "tool_result",
                            "name": getattr(resp, 'name', 'unknown'),
                            "result": getattr(resp, 'response', None),
                        }
                        #print(f"📤 发送工具结果 #{i+1}: name={result_data['name']}, result_type={type(result_data['result'])}")
                        yield _sse_pack(result_data)

                # 文本流
                if event.content and event.content.parts and event.content.parts[0].text:
                    current_text = event.content.parts[0].text
                    is_partial = getattr(event, 'partial', False)
                    #print(f"📝 文本内容: partial={is_partial}, length={len(current_text)}")
                    
                    if is_partial:
                        if current_text.startswith(accumulated_text):
                            delta_text = current_text[len(accumulated_text):]
                            if delta_text:
                                delta_data = {"type": "delta", "text": delta_text}
                                print(f"📤 发送增量文本: '{delta_text[:]}{'...' if len(delta_text) > 50 else ''}'")
                                yield _sse_pack(delta_data)
                                accumulated_text = current_text
                        else:
                            delta_data = {"type": "delta", "text": current_text}
                            #print(f"📤 发送完整文本: '{current_text[:50]}{'...' if len(current_text) > 50 else ''}'")
                            yield _sse_pack(delta_data)
                            accumulated_text += current_text
                    else:
                        if current_text.startswith(accumulated_text):
                            remaining_text = current_text[len(accumulated_text):]
                            if remaining_text:
                                delta_data = {"type": "delta", "text": remaining_text}
                                print(f"📤 发送剩余文本: '{remaining_text[:50]}{'...' if len(remaining_text) > 50 else ''}'")
                                yield _sse_pack(delta_data)
                        elif not accumulated_text:
                            delta_data = {"type": "delta", "text": current_text}
                            print(f"📤 发送初始文本: '{current_text[:50]}{'...' if len(current_text) > 50 else ''}'")
                            yield _sse_pack(delta_data)

                        # 回合结束
                        turn_complete = hasattr(event, 'turn_complete') and event.turn_complete
                        if turn_complete:
                            print(f"✅ 对话轮次完成 (turn_complete=True)")
                            break
                        elif not is_partial and (not hasattr(event, 'turn_complete') or event.turn_complete is None):
                            print(f"✅ 对话轮次完成 (partial=False)")
                            break

            print(f"🏁 处理完成，总共处理了 {event_count} 个事件")
            done_data = {"type": "done"}
            print(f"📤 发送完成信号: {done_data}")
            yield _sse_pack(done_data)
            
        except Exception as e:
            print(f"❌ 流式处理异常: {str(e)}")
            import traceback
            traceback.print_exc()
            error_data = {"type": "error", "error": str(e)}
            yield _sse_pack(error_data)
        finally:
            # 🆕 对话结束时移除活跃标记
            if final_session_id:
                active_sessions.discard(final_session_id)
                print(f"✅ 会话 {final_session_id} 标记为非活跃状态")
            
            # 只清理临时创建的runner（没有会话ID的情况）
            if should_close_runner:
                try:
                    print(f"🧹 清理临时创建的runner...")
                    await local_runner.close()
                    print(f"✅ 临时runner已关闭")
                except Exception as cleanup_error:
                    print(f"⚠️ 清理临时runner时出错: {str(cleanup_error)}")

    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    }
    return StreamingResponse(event_gen(), media_type="text/event-stream", headers=headers)


@app.get("/html-content")
async def get_html_content(file_path: str = Query(..., description="HTML文件的完整路径")):
    """获取HTML文件内容的API端点"""
    print(f"🔍 收到HTML文件请求: {file_path}")
    
    try:
        # URL解码（虽然FastAPI通常会自动处理，但我们手动确保）
        from urllib.parse import unquote
        decoded_path = unquote(file_path)
        print(f"🔍 解码后路径: {decoded_path}")
        
        # 安全检查：确保文件路径是绝对路径且存在
        if not os.path.isabs(decoded_path):
            print(f"❌ 文件路径必须是绝对路径: {decoded_path}")
            raise HTTPException(status_code=400, detail="文件路径必须是绝对路径")
        
        if not os.path.exists(decoded_path):
            print(f"❌ 文件不存在: {decoded_path}")
            print(f"🔍 当前工作目录: {os.getcwd()}")
            # 列出目录内容帮助调试
            dir_path = os.path.dirname(decoded_path)
            if os.path.exists(dir_path):
                files = os.listdir(dir_path)
                print(f"🔍 目录 {dir_path} 内容: {files}")
            raise HTTPException(status_code=404, detail="文件不存在")
        
        if not decoded_path.endswith('.html'):
            print(f"❌ 只支持HTML文件: {decoded_path}")
            raise HTTPException(status_code=400, detail="只支持HTML文件")
        
        print(f"✅ 开始读取文件: {decoded_path}")
        # 读取文件内容
        with open(decoded_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        print(f"✅ 文件读取成功，内容长度: {len(content)} 字符")
        return JSONResponse({
            "success": True,
            "content": content,
            "file_path": decoded_path
        })
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 读取文件异常: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"读取文件失败: {str(e)}")



if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "9000"))
    uvicorn.run(app, host="0.0.0.0", port=port)