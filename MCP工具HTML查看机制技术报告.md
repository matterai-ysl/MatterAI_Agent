# MCP工具HTML查看机制技术报告

## 概述

MatterAI Agent支持**分屏HTML查看**功能，允许MCP工具生成HTML报告，并在前端以iframe形式预览显示。这是一个关键的扩展机制，对开发自定义MCP工具极其重要。

## 🎯 触发条件

### 1. 工具结果格式要求

MCP工具需要在返回结果中包含特定格式的键名：

#### **A. 本地HTML文件路径**
```python
# 工具返回结果格式
def your_mcp_tool():
    return {
        "analysis_html_path": "/path/to/your/report.html",
        "visualization_html_path": "/path/to/charts.html",
        # 任何以 '_html_path' 结尾的键都会被识别
    }
```

#### **B. 在线HTML URL**
```python
# 工具返回结果格式
def your_mcp_tool():
    return {
        "report_url": "https://example.com/report.html", 
        "dashboard_html_url": "https://your-site.com/dashboard.html",
        "analysis_url": "http://localhost:8080/results.html",
        # 以 'url', 'html_url', 'report_url' 结尾的键会被识别为URL
    }
```

### 2. 键名识别规则

前端 `ToolDisplay.tsx` 中的**智能识别逻辑**：

```typescript
function extractHtmlContent(result: any) {
  Object.entries(result).forEach(([key, value]) => {
    if (typeof value === 'string') {
      // 🔍 首先检查值是否为HTTP(S) URL
      const isHttpUrl = /^https?:\/\//i.test(value);
      
      // 🔑 HTML相关键名检测（支持描述性前缀）
      const isHtmlKey = key.endsWith('html_path') || 
                       key.endsWith('_url') || 
                       key.endsWith('html_url') || 
                       key.endsWith('report_url') ||
                       key.endsWith('url');
      
      if (isHtmlKey) {
        if (isHttpUrl) {
          // ✅ 值是HTTP URL → 归类为URL（无论键名如何）
          htmlUrls.push({ key, url: value });
        } else if (key.endsWith('html_path')) {
          // ✅ 键名html_path + 非URL值 → 本地路径
          htmlPaths.push({ key, path: value });
        } else {
          // ✅ 其他URL键名 → 归类为URL
          htmlUrls.push({ key, url: value });
        }
      }
    }
  });
}
```

**关键改进**：
- **智能值检测**：优先根据值的内容（是否HTTP URL）判断类型
- **描述性键名支持**：`seed_selection_report_summary_html_path` 等长键名正确识别
- **兼容性增强**：同时支持简短和描述性的键名

### 3. 实际案例示例

**典型的MINDS工具返回结果**：
```json
{
  "session_id": "47a07f3a-1465-46c9-9a18-13094de01ddd",
  "optimal_k": 8,
  "selected_seeds_count": 8,
  // ✅ 这个键名虽然很长，但以 _html_path 结尾，值是HTTP URL
  "seed_selection_report_summary_html_path": "http://localhost:8080/static/seed_selection/47a07f3a-1465-46c9-9a18-13094de01ddd/seed_selection_report.html",
  // ✅ 其他URL类型的键
  "archive_details_zip_path": "http://localhost:8080/download/file/seed_selection/archives/seed_selection_47a07f3a-1465-46c9-9a18-13094de01ddd_20250903_154014.zip"
}
```

**识别结果**：
- `seed_selection_report_summary_html_path` → 检测为 **HTML URL**（绿色按钮）
- `archive_details_zip_path` → 检测为 **一般URL**（可点击链接）

### 4. Google ADK 结构化内容处理

**问题背景**：Google ADK会重新解析MCP服务器的返回结果，将原始JSON包装为：

```json
{
  "result": {  // 第一层 result
    "content": [
      {
        "type": "text", 
        "text": "{\"session_id\":\"...\", \"html_path\":\"...\"}"  // JSON字符串
      }
    ],
    "structuredContent": {  // 第二层 structuredContent
      "session_id": "47a07f3a-1465-46c9-9a18-13094de01ddd",
      "seed_selection_report_summary_html_path": "http://localhost:8080/...",
      // 真正的结构化数据在这里
    }
  }
}
```

**关键路径**：`result.result.structuredContent`（双层嵌套）

**解决方案**：前端HTML检测逻辑优先使用 `structuredContent`：

```typescript
function extractHtmlContent(result: any) {
  // 🔍 优先检查 Google ADK 的 structuredContent
  let targetContent = result;
  if (result && result.structuredContent && typeof result.structuredContent === 'object') {
    console.log('🔍 检测到 Google ADK structuredContent，使用结构化内容');
    targetContent = result.structuredContent;
  }
  
  // 在 targetContent 中查找HTML相关键名
  // ...
}
```

## 🔧 技术实现架构

### 前端组件架构

```
App/NewApp/MindsApp
├── ToolDisplay 组件
│   ├── extractHtmlContent() - 从工具结果提取HTML信息
│   ├── ToolResultDisplay - 显示预览按钮
│   └── onViewHtml 回调触发
├── HtmlViewer 组件
│   ├── 本地文件：通过 /html-content API获取内容
│   ├── 在线URL：直接iframe嵌入
│   └── 工具栏：刷新、新窗口打开、全屏等
└── 分屏布局管理
```

### 后端API支持

#### `/html-content` 接口
```python
@app.get("/html-content")
async def get_html_content(file_path: str = Query(...)):
    """获取本地HTML文件内容的API端点"""
    # 安全检查：绝对路径、文件存在、.html扩展名
    # 读取文件内容并返回JSON格式
    return {
        "success": True,
        "content": html_content,
        "file_path": file_path
    }
```

## 🚀 自动触发机制

### 1. 手动点击触发
用户点击工具结果中显示的预览按钮：
- 🟦 蓝色按钮：本地HTML文件（`*_html_path`）
- 🟢 绿色按钮：在线URL（`*_url`）

### 2. 工具展开自动触发
```typescript
// ToolDisplay.tsx 中的自动预览逻辑
const handleOpenChange = (isOpen: boolean) => {
  if (isOpen && toolResult && onViewHtml) {
    const { htmlPaths, htmlUrls } = extractHtmlContent(toolResult.result);
    
    // 优先级：URL > 本地路径
    if (htmlUrls.length > 0) {
      const firstUrl = htmlUrls[0];
      onViewHtml(firstUrl.url, `${firstUrl.key} 预览`);
    } else if (htmlPaths.length > 0) {
      const firstPath = htmlPaths[0];
      onViewHtml(firstPath.path, `${firstPath.key} 预览`);
    }
  }
};
```

**当用户点击展开工具详情时，如果结果包含HTML，会自动在分屏中显示！**

## 📋 MCP工具开发指南

### 1. 基础HTML文件输出

```python
import os
import tempfile
from typing import Dict, Any

def generate_analysis_report(data) -> Dict[str, Any]:
    """生成分析报告的MCP工具示例"""
    
    # 创建HTML内容
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Material Analysis Report</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 20px; }}
            .header {{ background: #f0f8ff; padding: 20px; border-radius: 8px; }}
            .chart {{ margin: 20px 0; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Material Analysis Results</h1>
            <p>Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        </div>
        <div class="content">
            <h2>Analysis Summary</h2>
            <p>Your analysis results here...</p>
        </div>
    </body>
    </html>
    """
    
    # 保存到临时文件
    with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False) as f:
        f.write(html_content)
        html_path = f.name
    
    return {
        "summary": "Analysis completed successfully",
        "analysis_html_path": html_path,  # 🔑 关键：以 _html_path 结尾
        "data_points": len(data)
    }
```

### 2. 多个HTML输出

```python
def comprehensive_analysis() -> Dict[str, Any]:
    """包含多个HTML输出的工具示例"""
    
    # 生成主报告
    main_report_path = create_main_report() 
    
    # 生成图表页面
    charts_path = create_charts_page()
    
    # 生成数据表格
    data_table_path = create_data_table()
    
    return {
        "status": "Analysis complete",
        "main_report_html_path": main_report_path,      # 主报告
        "charts_html_path": charts_path,                # 图表
        "data_table_html_path": data_table_path,        # 数据表
        "summary": "Generated 3 HTML reports"
    }
```

### 3. 在线URL输出

```python
def deploy_dashboard() -> Dict[str, Any]:
    """部署在线dashboard的工具示例"""
    
    # 部署dashboard到Web服务器
    dashboard_url = deploy_to_server()
    api_docs_url = generate_api_docs()
    
    return {
        "deployment_status": "success",
        "dashboard_url": dashboard_url,           # 🔑 以 _url 结尾
        "api_documentation_url": api_docs_url,   # 🔑 以 _url 结尾  
        "access_info": "Dashboard is now live"
    }
```

## 🎨 最佳实践

### 1. HTML内容建议
- **自包含**：CSS/JS内联，避免外部依赖
- **响应式设计**：适配iframe显示环境
- **安全考虑**：避免恶意脚本，使用sandbox

### 2. 文件管理
```python
# 建议的文件路径管理
import os
from pathlib import Path

# 创建项目专用的HTML输出目录
HTML_OUTPUT_DIR = Path("./html_reports")
HTML_OUTPUT_DIR.mkdir(exist_ok=True)

def create_report_file(content: str, filename: str) -> str:
    """创建HTML报告文件"""
    file_path = HTML_OUTPUT_DIR / filename
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    return str(file_path.absolute())  # 返回绝对路径
```

### 3. 错误处理
```python
def robust_html_generator() -> Dict[str, Any]:
    """带错误处理的HTML生成器"""
    try:
        html_path = generate_complex_report()
        return {
            "status": "success",
            "report_html_path": html_path
        }
    except Exception as e:
        # 生成错误报告HTML
        error_html = create_error_report(str(e))
        return {
            "status": "error",
            "error_message": str(e),
            "error_report_html_path": error_html
        }
```

## 🔍 调试与测试

### 1. 内置测试工具
后端提供了测试HTML功能：
```python
# main.py 中的测试工具
def test_html(format: str = "html") -> dict:
    return {"html_path": "/Users/ysl/Desktop/Code/MatterAI_Agent/test_report.html"}
```

### 2. 前端查看流程
1. 用户发送消息
2. AI调用MCP工具 
3. 工具返回包含HTML路径/URL的结果
4. ToolDisplay检测HTML相关键
5. 显示预览按钮或自动打开
6. HtmlViewer在分屏中渲染

### 3. 常见问题排查

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| HTML不显示预览按钮 | 键名不符合规则 | 确保以`_html_path`、`_url`、`url`结尾 |
| 描述性键名无法识别 | 键名过于复杂 | ✅ 已修复：支持如`xxx_report_summary_html_path` |
| HTTP URL显示为本地文件 | 值类型判断错误 | ✅ 已修复：优先检查值是否为HTTP URL |
| MINDS工具无法弹窗 | 键值匹配问题 | ✅ 已修复：智能识别HTTP URL值 |
| 本地文件404错误 | 路径不正确 | 使用绝对路径，检查文件存在 |
| URL无法加载 | 跨域问题 | 确保目标服务器允许iframe嵌入 |
| 内容显示异常 | HTML格式问题 | 检查HTML语法，使用自包含样式 |

**✅ 最新修复（2025-09-03）**：
- 修复了描述性键名（如`seed_selection_report_summary_html_path`）识别问题
- 修复了`html_path`键但值为HTTP URL时的分类错误
- 改进了键值匹配优先级：值类型 > 键名类型
- **🔑 Google ADK 兼容性修复**：支持 `result.structuredContent` 结构化内容解析

## 🌟 扩展应用场景

1. **数据分析报告**：统计图表、数据洞察
2. **可视化展示**：3D模型、交互图表
3. **实验结果**：材料性能测试报告
4. **工作流程**：步骤说明、操作指南
5. **仪表板**：实时监控、状态概览
6. **文档生成**：API文档、技术规格

## 🎯 总结

HTML查看机制为MCP工具提供了强大的可视化能力：

- ✅ **简单触发**：返回结果包含正确键名即可
- ✅ **双重支持**：本地文件 + 在线URL
- ✅ **自动显示**：展开工具时自动预览
- ✅ **用户友好**：分屏查看，不影响对话
- ✅ **功能完备**：全屏、刷新、新窗口等

这个机制极大地扩展了MCP工具的表达能力，是开发高级分析工具的重要基础设施。