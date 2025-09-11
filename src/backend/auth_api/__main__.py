import uvicorn
from fastapi import FastAPI
from .auth_routes import router as auth_router

app = FastAPI(title="认证 API 测试", description="用户认证系统的独立测试")
app.include_router(auth_router)

if __name__ == "__main__":
    print("启动认证 API 服务...")
    uvicorn.run(app, host="127.0.0.1", port=8000) 