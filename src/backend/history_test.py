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
session_service = DatabaseSessionService(db_url=DATABASE_URL)
async def main():
    await list_existing_sessions(session_service, USER_ID)
    session =  await session_service.get_session(app_name=APP_NAME, user_id=USER_ID, session_id="02c0af9a-63b8-4257-add5-163df3510ca5")
    for evt in session.events: # type: ignore
        print(evt)
        print(evt.content.role) # type: ignore
        print("--------------------------------")

if __name__ == "__main__":
    asyncio.run(main())
# for evt in session.events:
#     print(evt)
