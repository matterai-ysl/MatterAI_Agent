#!/bin/bash

echo "=== MatterAI Agent 静态部署测试脚本 ==="
echo

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试函数
test_endpoint() {
    local url="$1"
    local description="$2"
    local expected_status="${3:-200}"

    echo -n "测试 $description ($url): "

    response=$(curl -s -w "%{http_code}" -o /dev/null "$url" 2>/dev/null)

    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✓ 通过 (HTTP $response)${NC}"
        return 0
    else
        echo -e "${RED}✗ 失败 (HTTP $response, 期望 $expected_status)${NC}"
        return 1
    fi
}

echo "1. 测试本地静态服务器路由"
echo "--------------------------------"
test_endpoint "http://localhost:3000/agent/" "主页面"
test_endpoint "http://localhost:3000/agent/minds" "MINDS页面"
test_endpoint "http://localhost:3000/agent/auth" "认证页面"
test_endpoint "http://localhost:3000/agent/static/js/main.f55837fd.js" "JS资源文件"
test_endpoint "http://localhost:3000/agent/static/css/main.672f33b6.css" "CSS资源文件"
echo

echo "2. 测试后端API连接"
echo "--------------------------------"
test_endpoint "http://47.99.180.80/agent/api/health" "后端健康检查"
echo

echo "3. 测试文件上传服务"
echo "--------------------------------"
# 文件上传需要POST请求，HEAD请求返回405是正常的
response=$(curl -s -w "%{http_code}" -X OPTIONS -o /dev/null "http://47.99.180.80/file/upload" 2>/dev/null)
if [ "$response" = "200" ] || [ "$response" = "405" ]; then
    echo -e "测试 文件上传服务 (http://47.99.180.80/file/upload): ${GREEN}✓ 通过 (HTTP $response)${NC}"
else
    echo -e "测试 文件上传服务 (http://47.99.180.80/file/upload): ${RED}✗ 失败 (HTTP $response)${NC}"
fi
echo

echo "4. 检查静态文件结构"
echo "--------------------------------"
if [ -f "build/index.html" ]; then
    echo -e "build/index.html: ${GREEN}✓ 存在${NC}"
else
    echo -e "build/index.html: ${RED}✗ 不存在${NC}"
fi

if [ -d "build/static" ]; then
    echo -e "build/static/: ${GREEN}✓ 存在${NC}"
    echo "  JS文件数量: $(find build/static -name "*.js" | wc -l | tr -d ' ')"
    echo "  CSS文件数量: $(find build/static -name "*.css" | wc -l | tr -d ' ')"
else
    echo -e "build/static/: ${RED}✗ 不存在${NC}"
fi

if [ -d "build/assets" ]; then
    echo -e "build/assets/: ${GREEN}✓ 存在${NC}"
    echo "  图片资源数量: $(find build/assets -name "*.png" -o -name "*.jpg" -o -name "*.gif" | wc -l | tr -d ' ')"
else
    echo -e "build/assets/: ${RED}✗ 不存在${NC}"
fi
echo

echo "5. 检查环境配置"
echo "--------------------------------"
if [ -f ".env.production" ]; then
    echo -e ".env.production: ${GREEN}✓ 存在${NC}"
    echo "  API_BASE_URL: $(grep REACT_APP_API_BASE_URL .env.production | cut -d'=' -f2)"
    echo "  FILE_UPLOAD_URL: $(grep REACT_APP_FILE_UPLOAD_URL .env.production | cut -d'=' -f2)"
else
    echo -e ".env.production: ${RED}✗ 不存在${NC}"
fi

if [ -f "package.json" ]; then
    homepage=$(grep -o '"homepage"[^,]*' package.json | cut -d'"' -f4)
    echo -e "package.json homepage: ${GREEN}✓ $homepage${NC}"
else
    echo -e "package.json: ${RED}✗ 不存在${NC}"
fi
echo

echo "6. 浏览器测试建议"
echo "--------------------------------"
echo -e "${YELLOW}请在浏览器中测试以下URL:${NC}"
echo "  • http://localhost:3000/agent/ - 主应用"
echo "  • http://localhost:3000/agent/minds - MINDS智能体"
echo "  • http://localhost:3000/agent/auth - 用户认证"
echo
echo -e "${YELLOW}检查要点:${NC}"
echo "  1. 页面是否正常加载（无白屏、无404错误）"
echo "  2. 路由跳转是否工作（特别是刷新页面后）"
echo "  3. API调用是否成功（查看浏览器开发者工具网络面板）"
echo "  4. 文件上传功能是否正常"
echo "  5. 样式和资源是否正确加载"
echo
echo "=== 测试完成 ==="