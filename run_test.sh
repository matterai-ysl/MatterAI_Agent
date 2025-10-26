#!/bin/bash
# ADK Web 测试启动脚本

echo "======================================"
echo "🚀 启动 ADK Web PDF 处理测试"
echo "======================================"
echo ""

# 检查 Python 环境
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误：未找到 Python3"
    echo "请先安装 Python 3.8 或更高版本"
    exit 1
fi

echo "✅ Python 版本："
python3 --version
echo ""

# 检查是否安装了 google-adk
echo "🔍 检查依赖..."
if ! python3 -c "import google.adk" 2>/dev/null; then
    echo "❌ 未安装 google-adk"
    echo ""
    echo "正在安装依赖..."
    pip3 install google-adk requests python-dotenv
    echo ""
fi

# 检查可选依赖
if ! python3 -c "import PyPDF2" 2>/dev/null; then
    echo "⚠️  提示：未安装 PyPDF2（可选）"
    echo "   如需文本提取功能，请运行：pip3 install PyPDF2"
    echo ""
fi

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "⚠️  警告：未找到 .env 文件"
    echo "请创建 .env 文件并配置 API Key"
    echo ""
    echo "示例配置："
    echo "OPENAI_API_KEY=your_api_key"
    echo "BASE_URL=https://api.openai.com/v1"
    echo ""
else
    echo "✅ 找到 .env 配置文件"
    echo ""
fi

# 启动 ADK Web
echo "======================================"
echo "🌐 启动 ADK Web 界面..."
echo "======================================"
echo ""
echo "📋 测试方法："
echo "1. 在浏览器中打开显示的 URL"
echo "2. 发送消息：请分析这个 PDF：[你的PDF URL]"
echo "3. 或直接上传 PDF 文件"
echo ""
echo "按 Ctrl+C 停止服务器"
echo ""
echo "======================================"
echo ""

# 运行 ADK Web
adk web test.py

