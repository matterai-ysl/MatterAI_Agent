# ADK Web 多模态 PDF 处理测试

## 📁 文件说明

| 文件 | 说明 |
|------|------|
| `test.py` | 主测试脚本，包含 Agent 和工具定义 |
| `test_pdf_guide.md` | 详细使用指南和技术文档 |
| `run_test.sh` | Linux/Mac 启动脚本 |
| `run_test.bat` | Windows 启动脚本 |

## 🚀 快速开始

### 方式 1: 使用启动脚本（推荐）

**Linux/Mac:**
```bash
./run_test.sh
```

**Windows:**
```cmd
run_test.bat
```

### 方式 2: 直接运行

```bash
# 1. 安装依赖
pip install google-adk requests python-dotenv

# 2. （可选）安装文本提取工具
pip install PyPDF2

# 3. 启动 ADK Web
adk web test.py
```

## ⚙️ 配置说明

### 环境变量 (.env)

```env
# 使用 OpenAI API
OPENAI_API_KEY=sk-xxx...
BASE_URL=https://api.openai.com/v1

# 或使用 Google Gemini
GOOGLE_API_KEY=AIza...
```

### 修改模型配置

编辑 `test.py` 第 28-36 行：

```python
# 当前配置（OpenAI）
model = LiteLlm(
    model="openai/gpt-4o",
    api_base=os.getenv("BASE_URL"),
    api_key=os.getenv("OPENAI_API_KEY")
)

# 切换到 Gemini（取消注释）
# from google.adk.models import GeminiModel
# model = GeminiModel(
#     model="gemini-1.5-pro",
#     api_key=os.getenv("GOOGLE_API_KEY")
# )
```

## 📝 测试示例

### 1. 分析在线 PDF

在 ADK Web 界面输入：

```
请分析这个 PDF：https://arxiv.org/pdf/2301.00001.pdf
```

Agent 会：
1. ✅ 下载 PDF
2. ✅ 保存为 Artifact
3. ✅ 使用多模态能力理解内容
4. ✅ 回答你的问题

### 2. 上传本地 PDF

```
[上传文件: paper.pdf]

这篇论文的主要结论是什么？
```

### 3. 多轮对话

```
你: 请分析 https://example.com/paper.pdf
AI: ✅ 已分析，PDF 保存为 Artifact: pdf_123456789

你: 提取文档中的所有表格数据
AI: [基于已保存的 PDF 回答]

你: 总结第3章的内容
AI: [继续使用同一个 PDF]
```

### 4. 提取元信息

```
获取 PDF pdf_123456789 的详细信息
```

输出：
```json
{
  "page_count": 12,
  "file_size": 2456789,
  "preview": "摘要：本研究..."
}
```

## 🛠️ 可用工具

### 1. `analyze_pdf_from_url`

**描述:** 从 URL 下载并分析 PDF

**参数:**
- `url` (str): PDF 文件的 URL

**返回:**
```json
{
  "status": "success",
  "artifact_name": "pdf_123456789",
  "file_size": 2456789,
  "version": "v1"
}
```

### 2. `load_artifacts`

**描述:** 加载之前保存的 Artifact（ADK 内置）

**参数:**
- `artifact_name` (str): Artifact 名称

### 3. `extract_pdf_info`

**描述:** 提取 PDF 元信息

**参数:**
- `artifact_name` (str): Artifact 名称

**返回:**
```json
{
  "page_count": 12,
  "file_size": 2456789,
  "preview": "前1000字符..."
}
```

## 🧪 测试场景

### 场景 A: 学术论文分析

```
你: 请分析这篇论文：https://arxiv.org/pdf/2301.00001.pdf

问题：
1. 论文的研究方法是什么？
2. 主要贡献有哪些？
3. 实验结果如何？
```

### 场景 B: 技术文档查询

```
你: [上传 API 文档.pdf]

问题：
1. 如何使用认证功能？
2. 有哪些可用的接口？
3. 错误码有哪些？
```

### 场景 C: 多文档对比

```
你: 分析 paper1.pdf
你: 分析 paper2.pdf
你: 对比这两篇论文的方法差异
```

## 📊 技术原理

### Artifact 存储机制

```
┌─────────────────┐
│   PDF Binary    │
│  (application/  │
│      pdf)       │
└────────┬────────┘
         │
         │ types.Part(inline_data=...)
         ↓
┌─────────────────┐
│    Artifact     │
│  - name         │
│  - version      │
│  - data         │
└────────┬────────┘
         │
         │ load_artifact()
         ↓
┌─────────────────┐
│  Gemini Model   │
│ 直接理解 PDF 内容 │
└─────────────────┘
```

### 为什么不需要 PyPDF2？

**传统方式:**
```
PDF → PyPDF2 → 文本 → LLM
```

**Gemini 多模态:**
```
PDF → Gemini (直接理解！)
```

**优势:**
- ✅ 保留原始格式
- ✅ 支持图表、表格
- ✅ 理解布局结构
- ✅ 无需额外依赖

**PyPDF2 的用途:**
- ⚙️ 提取元信息（页数、大小）
- ⚙️ 生成文本预览
- ⚙️ 可选功能，非必需

## 🐛 故障排查

### 问题 1: 找不到 adk 命令

**解决:**
```bash
pip install google-adk
```

### 问题 2: API Key 错误

**检查:**
```bash
cat .env
# 确认 API Key 正确
```

### 问题 3: 无法下载 PDF

**原因:** 
- URL 无效
- 网络限制
- 文件需要认证

**解决:**
- 使用公开可访问的 URL
- 或上传本地文件

### 问题 4: 内存不足

**PDF 文件过大时:**

编辑 `test.py`，添加大小限制：

```python
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

if len(pdf_content) > MAX_FILE_SIZE:
    return {
        "status": "error",
        "message": "文件太大，请上传小于 10MB 的文件"
    }
```

## 📚 扩展开发

### 添加新工具

在 `test.py` 中添加：

```python
async def summarize_pdf(artifact_name: str, tool_context: ToolContext) -> dict:
    """总结 PDF 内容"""
    artifact = await tool_context.load_artifact(artifact_name)
    
    # 处理逻辑...
    
    return {"summary": "..."}

# 添加到 Agent 工具列表
agent = LlmAgent(
    tools=[
        load_artifacts,
        analyze_pdf_from_url,
        extract_pdf_info,
        summarize_pdf,  # 新工具
    ]
)
```

### 集成到生产环境

参考 `main.py` 的实现：
1. 使用 DatabaseSessionService（持久化会话）
2. 使用 GcsArtifactService（云存储）
3. 添加用户认证
4. 实现权限控制

## 🔗 相关资源

- [详细技术文档](./test_pdf_guide.md)
- [Google ADK 官方文档](https://ai.google.dev/adk)
- [Gemini API 文档](https://ai.google.dev/gemini-api)
- [主项目文档](./docs/技术设计说明.md)

## 💡 核心优势

| 传统方式 | ADK + Gemini 多模态 |
|---------|-------------------|
| ❌ 需要 PyPDF2 解析 | ✅ 直接理解 PDF |
| ❌ 丢失格式信息 | ✅ 保留原始布局 |
| ❌ 图表无法处理 | ✅ 支持多模态内容 |
| ❌ 代码复杂 | ✅ 简洁优雅 |

## 🎯 下一步

1. **运行测试:** `./run_test.sh`
2. **查看详细文档:** [test_pdf_guide.md](./test_pdf_guide.md)
3. **集成到项目:** 参考 `main.py` 实现
4. **添加更多功能:** 自定义工具开发

---

**开始测试吧！** 🚀

```bash
./run_test.sh
```

浏览器打开 → 上传 PDF → 开始对话！

