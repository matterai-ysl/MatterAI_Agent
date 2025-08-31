"""
google-adk-version: 1.8.0
"""
from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm
from google.adk.runners import Runner
from google.adk.sessions import DatabaseSessionService
from google.genai import types 
from google.adk.agents.run_config import RunConfig, StreamingMode
import warnings
import asyncio
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPServerParams
from fastapi import FastAPI, UploadFile, File, Request, HTTPException, Query
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional, AsyncGenerator, Any, Dict, cast
import json
import uuid
import time
from datetime import datetime
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os
load_dotenv(override=True)


APP_NAME = "chatbot"
USER_ID = "user_1"
SESSION_ID = "session_1"

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
    
    print(f"✅ 会话创建成功并保存到数据库，Session ID: {new_session.id}")
    return new_session.id  # 返回实际的 session_id
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

############################
# MCP 工具与 Agent 定义
############################

amap_mcp_server = MCPToolset(
    connection_params=StreamableHTTPServerParams(
        url="http://127.0.0.1:8000/mcp",  # 通过 Streamable HTTP 连接到 MCP 服务器
        timeout=10.0,  # 设置请求超时时间
        sse_read_timeout=300.0,  # 设置 SSE 读取超时时间
        terminate_on_close=True  # 设客户端关闭连接时，请求体里带 terminate=true，服务器立即回收资源，避免僵尸会话
    ),
    tool_filter=[
        # 地址与坐标转换
        "maps_geo",           # 地址转坐标
        "maps_regeocode",     # 坐标转地址
        
        # 景点搜索
        "maps_text_search",   # 关键词搜索景点（如"故宫"、"长城"）
        "maps_around_search", # 周边景点搜索（以某点为中心搜索）
        "maps_search_detail", # 景点详细信息（地址、电话、评分等）
        
        # 路线规划
        "maps_direction_driving_by_address",  # 驾车路线
        "maps_direction_walking_by_address",  # 步行路线
        "maps_direction_transit_integrated_by_address",  # 公交路线
        
        # 距离计算
        "maps_distance",      # 计算距离
        
        # 天气查询
        "maps_weather"        # 查询目的地天气
    ]
)


# 创建 Agent
root_agent = LlmAgent(
    name="scenic_mcp_agent",  # 景点规划助手
    model=model,
    instruction = """
    ## 角色
    你是“AI 旅游规划助手”，熟悉中国及全球主要旅游城市的景点、交通与天气信息，可调用 amap_mcp_server MCP 工具回答问题。

    ## 工具调用决策 (STRICT)
    若用户请求包含下列任一关键词 ➜ **必须先调用工具**，不得直接回答：
    - 旅行规划、景点推荐、目的地天数、景点、路线、距离、实时天气等具体涉及工具调用的关键词
    若不满足，请礼貌告知“需更具体信息”。

    ## 工具使用指南
    - **maps_text_search / maps_around_search**：当用户提出地点关键词或想了解周边景点时调用。
    - **maps_search_detail**：在展示任何景点前，务必调用以补全评分、地址、营业时间等。
    - **maps_direction_driving_by_address / maps_direction_transit_integrated_by_address / maps_direction_walking_by_address**：规划路线时，根据用户偏好（默认驾车 > 公交 > 步行）选择其一调用。
    - **maps_distance**：需要比较多个候选景点或评估路程时调用。
    - **maps_weather**：在给出最终行程建议前，查询出发日及游玩日天气并告知用户可能影响。

    ## 工作流程
    1. **澄清需求**：用中文确认目的地、天数、兴趣点和出行方式。
    2. **检索景点**：按需调用搜索工具获取候选 POI。
    3. **获取详情**：为每个候选 POI 调用 `maps_search_detail`。
    4. **评估与筛选**：使用 `maps_distance` 与路线工具比较时间/距离，选择最优组合。
    5. **检查天气**：调用 `maps_weather` 并调整行程顺序（如遇雨优先室内景点）。
    6. **生成行程**：按照“日程 -> 交通 -> 景点 -> 餐饮 -> 住宿”结构输出建议，并附上简洁理由。

    ## 回答格式
    - **简要回复**：无需工具时，以自然段回答。
    - **行程计划**：使用 Markdown 列表，按天列出：
    - **交通**：起点→目的地的路线描述
    - **景点**：含预计停留时间
    - **用餐/住宿**：如需建议则列出
    - **比较表**：若用户要求对比，使用 Markdown 表格：`景点 | 评分 | 距离 | 预计时长`。

    ## 交互风格
    - 使用简体中文，语气专业且亲切。
    - 遇到复杂查询时先在“思考”阶段分步推理，再在“行动”阶段调用工具（无需向用户展示思考内容）。
    """,
    tools=[amap_mcp_server], # 接入 MCP 服务器
)

############################
# FastAPI 应用
############################

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
# 运行资源
runner: Optional[Runner] = None
session_service: Optional[DatabaseSessionService] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global runner, session_service
    # 启动时执行
    print("🔄 启动 FastAPI 应用生命周期...")
    try:
        print("🔗 正在初始化数据库服务...")
        session_service = DatabaseSessionService(DATABASE_URL)
        print("✅ 数据库服务初始化成功")
        
        print("🤖 正在初始化 Agent Runner...")
        runner = Runner(agent=root_agent, app_name=APP_NAME, session_service=session_service)
        print("✅ Agent Runner 初始化成功")
        print(f"📊 当前 runner 状态: {runner is not None}")
        print(f"📊 当前 session_service 状态: {session_service is not None}")
    except Exception as e:
        print(f"❌ 服务初始化失败: {e}")
        raise e
    
    yield {"runner": runner, "session_service": session_service}
    
    # 关闭时执行
    print("🔄 关闭 FastAPI 应用...")
    try:
        await amap_mcp_server.close()
        print("✅ MCP 服务已关闭")
    finally:
        if runner is not None:
            await runner.close()
            print("✅ Runner 已关闭")

app = FastAPI(title="MatterAI Agent API", version="0.1.0", lifespan=lifespan)

# CORS（根据需要收敛域名）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件（上传文件访问）
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

class ChatRequest(BaseModel):
    user_id: str
    query: str
    session_id: Optional[str] = None


def _sse_pack(payload: Dict[str, Any]) -> str:
    """安全的 SSE 数据包装函数，处理不可序列化的对象"""
    try:
        # 尝试直接序列化
        serialized = json.dumps(payload, ensure_ascii=False)
        return f"data: {serialized}\n\n"
    except (TypeError, ValueError) as e:
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


@app.get("/sessions")
async def list_sessions(user_id: str = Query(..., description="用户ID")) -> Dict[str, List[str]]:
    print(f"📋 收到获取会话列表请求 - user_id: {user_id}")
    print(f"📊 session_service 状态: {session_service is not None}")
    
    if session_service is None:
        print("❌ session_service 未初始化")
        raise HTTPException(status_code=503, detail="Service not ready")
    
    try:
        ids = await list_existing_sessions(session_service, user_id)
        print(f"✅ 成功获取会话列表: {ids}")
        return {"sessions": ids}
    except Exception as e:
        print(f"❌ 获取会话列表失败: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get sessions: {str(e)}")


@app.get("/history")
async def get_history(user_id: str = Query(...), session_id: str = Query(...)) -> JSONResponse:
    if session_service is None:
        raise HTTPException(status_code=503, detail="Service not ready")
    session = await session_service.get_session(app_name=APP_NAME, user_id=user_id, session_id=session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    def serialize_event(evt: Any) -> Dict[str, Any]:
        role: Optional[str] = getattr(evt, 'role', None)
        
        # 基本消息结构
        message = {
            "role": role,
            "content": [],
            "toolCalls": [],
            "toolResults": [],
            "timestamp": getattr(evt, 'timestamp', None) or int(time.time() * 1000)
        }
        
        # 处理文本内容
        content = getattr(evt, 'content', None)
        if content and getattr(content, 'parts', None):
            for part in content.parts:
                text = getattr(part, 'text', None)
                if text:
                    message["content"].append({"type": "text", "text": text})
                    
                # 处理工具调用
                function_call = getattr(part, 'function_call', None)
                if function_call:
                    tool_call = {
                        "id": f"call_{getattr(function_call, 'id', 'unknown')}",
                        "name": getattr(function_call, 'name', 'unknown'),
                        "args": getattr(function_call, 'args', {}),
                        "timestamp": message["timestamp"]
                    }
                    message["toolCalls"].append(tool_call)
        
        # 处理工具调用（如果直接在事件上）
        if hasattr(evt, 'get_function_calls'):
            calls = evt.get_function_calls()
            if calls:
                for call in calls:
                    tool_call = {
                        "id": f"call_{getattr(call, 'id', 'unknown')}",
                        "name": getattr(call, 'name', 'unknown'),
                        "args": getattr(call, 'args', {}),
                        "timestamp": message["timestamp"]
                    }
                    message["toolCalls"].append(tool_call)
        
        # 处理工具结果
        if hasattr(evt, 'get_function_responses'):
            responses = evt.get_function_responses()
            if responses:
                for resp in responses:
                    tool_result = {
                        "id": f"result_{getattr(resp, 'id', 'unknown')}",
                        "name": getattr(resp, 'name', 'unknown'),
                        "result": getattr(resp, 'response', None),
                        "timestamp": message["timestamp"]
                    }
                    message["toolResults"].append(tool_result)
        
        # 如果没有内容，兜底处理
        if not message["content"] and not message["toolCalls"] and not message["toolResults"]:
            message["content"].append({"type": "text", "text": str(evt)})
            
        return message

    messages = [serialize_event(evt) for evt in getattr(session, 'events', [])]
    return JSONResponse({"session_id": session.id, "messages": messages})


@app.post("/chat/stream")
async def chat_stream(payload: ChatRequest) -> StreamingResponse:
    print(f"💬 收到流式聊天请求:")
    print(f"   用户ID: {payload.user_id}")
    print(f"   查询: {payload.query}")
    print(f"   会话ID: {payload.session_id}")
    print(f"📊 runner 状态: {runner is not None}")
    
    if runner is None:
        print("❌ runner 未初始化")
        raise HTTPException(status_code=503, detail="Service not ready")
    
    local_runner: Runner = cast(Runner, runner)
    user_id = payload.user_id
    requested_session_id = payload.session_id
    query_text = payload.query

    async def event_gen() -> AsyncGenerator[str, None]:
        try:
            print(f"🔄 开始处理流式响应...")
            
            # 确保会话存在
            print(f"🔄 创建或获取会话...")
            actual_session_id = await create_or_get_session(local_runner, user_id, requested_session_id)
            print(f"✅ 会话ID: {actual_session_id}")
            
            # 先下发 meta，会话ID供前端保存
            meta_data = {"type": "meta", "session_id": actual_session_id}
            print(f"📤 发送meta数据: {meta_data}")
            yield _sse_pack(meta_data)

            content = types.Content(role='user', parts=[types.Part(text=query_text)])
            run_config = RunConfig(streaming_mode=StreamingMode.SSE)
            accumulated_text = ""
            
            print(f"🤖 开始与Agent交互...")
            event_count = 0

            async for event in local_runner.run_async(user_id=user_id, session_id=actual_session_id, new_message=content, run_config=run_config):
                event_count += 1
                print(f"📨 收到事件 #{event_count}: {type(event).__name__}")
                
                # 工具调用提示
                if hasattr(event, 'get_function_calls') and event.get_function_calls():
                    calls = event.get_function_calls()
                    print(f"🔧 工具调用数量: {len(calls)}")
                    for i, call in enumerate(calls):
                        call_data = {
                            "type": "tool_call",
                            "name": getattr(call, 'name', 'unknown'),
                            "args": getattr(call, 'args', {}),
                        }
                        print(f"📤 发送工具调用 #{i+1}: {call_data}")
                        yield _sse_pack(call_data)

                # 工具结果
                if hasattr(event, 'get_function_responses') and event.get_function_responses():
                    responses = event.get_function_responses()
                    print(f"📋 工具结果数量: {len(responses)}")
                    for i, resp in enumerate(responses):
                        result_data = {
                            "type": "tool_result",
                            "name": getattr(resp, 'name', 'unknown'),
                            "result": getattr(resp, 'response', None),
                        }
                        print(f"📤 发送工具结果 #{i+1}: name={result_data['name']}, result_type={type(result_data['result'])}")
                        yield _sse_pack(result_data)

                # 文本流
                if event.content and event.content.parts and event.content.parts[0].text:
                    current_text = event.content.parts[0].text
                    is_partial = getattr(event, 'partial', False)
                    print(f"📝 文本内容: partial={is_partial}, length={len(current_text)}")
                    
                    if is_partial:
                        if current_text.startswith(accumulated_text):
                            delta_text = current_text[len(accumulated_text):]
                            if delta_text:
                                delta_data = {"type": "delta", "text": delta_text}
                                print(f"📤 发送增量文本: '{delta_text[:50]}{'...' if len(delta_text) > 50 else ''}'")
                                yield _sse_pack(delta_data)
                                accumulated_text = current_text
                        else:
                            delta_data = {"type": "delta", "text": current_text}
                            print(f"📤 发送完整文本: '{current_text[:50]}{'...' if len(current_text) > 50 else ''}'")
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

    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    }
    return StreamingResponse(event_gen(), media_type="text/event-stream", headers=headers)


@app.post("/upload")
async def upload_files(request: Request, files: List[UploadFile] = File(...)) -> List[str]:
    urls: List[str] = []
    for f in files:
        orig_name = f.filename or "file"
        suffix = os.path.splitext(orig_name)[1]
        unique_name = f"{datetime.utcnow().strftime('%Y%m%dT%H%M%S')}_{uuid.uuid4().hex}{suffix}"
        dest_path = os.path.join(UPLOAD_DIR, unique_name)
        content = await f.read()
        with open(dest_path, 'wb') as out:
            out.write(content)
        file_url = str(request.base_url) + "uploads/" + unique_name
        urls.append(file_url)
    return urls


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "9000"))
    uvicorn.run(app, host="0.0.0.0", port=port)

