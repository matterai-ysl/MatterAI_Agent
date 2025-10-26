@echo off
REM ADK Web 测试启动脚本 (Windows)

echo ======================================
echo 🚀 启动 ADK Web PDF 处理测试
echo ======================================
echo.

REM 检查 Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误：未找到 Python
    echo 请先安装 Python 3.8 或更高版本
    pause
    exit /b 1
)

echo ✅ Python 版本：
python --version
echo.

REM 检查依赖
echo 🔍 检查依赖...
python -c "import google.adk" >nul 2>&1
if errorlevel 1 (
    echo ❌ 未安装 google-adk
    echo.
    echo 正在安装依赖...
    pip install google-adk requests python-dotenv
    echo.
)

REM 检查可选依赖
python -c "import PyPDF2" >nul 2>&1
if errorlevel 1 (
    echo ⚠️  提示：未安装 PyPDF2（可选）
    echo    如需文本提取功能，请运行：pip install PyPDF2
    echo.
)

REM 检查 .env 文件
if not exist .env (
    echo ⚠️  警告：未找到 .env 文件
    echo 请创建 .env 文件并配置 API Key
    echo.
    echo 示例配置：
    echo OPENAI_API_KEY=your_api_key
    echo BASE_URL=https://api.openai.com/v1
    echo.
) else (
    echo ✅ 找到 .env 配置文件
    echo.
)

REM 启动 ADK Web
echo ======================================
echo 🌐 启动 ADK Web 界面...
echo ======================================
echo.
echo 📋 测试方法：
echo 1. 在浏览器中打开显示的 URL
echo 2. 发送消息：请分析这个 PDF：[你的PDF URL]
echo 3. 或直接上传 PDF 文件
echo.
echo 按 Ctrl+C 停止服务器
echo.
echo ======================================
echo.

REM 运行 ADK Web
adk web test.py

pause

