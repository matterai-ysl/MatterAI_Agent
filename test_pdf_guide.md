# ADK Web 多模态 PDF 处理测试指南

## 快速开始

### 1. 安装依赖

```bash
# 基础依赖
pip install google-adk requests python-dotenv

# 可选：如果需要文本提取功能
pip install PyPDF2
```

### 2. 配置环境变量

确保 `.env` 文件包含以下配置：

```env
# OpenAI API 配置（如果使用 GPT-4o）
OPENAI_API_KEY=your_api_key_here
BASE_URL=https://api.openai.com/v1

# 或者 Google Gemini 配置（如果使用 Gemini）
GOOGLE_API_KEY=your_google_api_key_here
```

### 3. 启动 ADK Web 界面

```bash
adk web test.py
```

启动后会显示类似：

```
✅ ADK Web server started at http://localhost:8000
🌐 Open your browser and visit: http://localhost:8000
```

### 4. 在浏览器中测试

打开 `http://localhost:8000`，你会看到一个聊天界面。

## 测试场景

### 场景 A：使用 PDF URL

1. 在聊天框输入：
   ```
   请帮我分析这个 PDF：https://arxiv.org/pdf/2301.00001.pdf
   ```

2. Agent 会：
   - 调用 `analyze_pdf_from_url` 工具下载 PDF
   - 将 PDF 保存为 Artifact
   - 使用 Gemini 多模态能力理解内容
   - 回答关于 PDF 的问题

### 场景 B：上传本地 PDF

1. 如果 ADK Web 界面支持文件上传：
   - 点击上传按钮
   - 选择本地 PDF 文件
   - 文件会被上传到服务器并生成 URL

2. 询问问题：
   ```
   这篇文档的主要结论是什么？
   ```

### 场景 C：多轮对话

```
你: 请分析这个 PDF：https://example.com/paper.pdf
AI: [分析 PDF 并保存为 Artifact]

你: 文档中提到的实验方法是什么？
AI: [基于已保存的 Artifact 回答]

你: 总结一下关键发现
AI: [继续基于同一个 PDF 回答]
```

## 工具说明

### 1. `analyze_pdf_from_url`

**功能：** 从 URL 下载 PDF 并保存为 Artifact

**使用示例：**
```
请分析这个文档：https://example.com/paper.pdf
```

**工作流程：**
1. 下载 PDF 文件
2. 创建 Blob 对象（包含 PDF 二进制）
3. 保存为 Artifact
4. 返回 Artifact 信息

### 2. `load_artifacts`

**功能：** 加载之前保存的 Artifact（ADK 内置工具）

**使用示例：**
```
加载之前的 PDF 文档 pdf_123456789
```

### 3. `extract_pdf_info`

**功能：** 提取 PDF 的元信息（页数、大小、文本预览）

**使用示例：**
```
获取 PDF pdf_123456789 的详细信息
```

**需要 PyPDF2：** 如果安装了 PyPDF2，会提取页数和文本预览

## Gemini 多模态处理原理

### 传统方式（需要 PyPDF2）

```python
# ❌ 需要额外解析
pdf_text = extract_text_with_pypdf2(pdf_file)
agent.send(pdf_text)
```

### Gemini 多模态方式

```python
# ✅ 直接传递 PDF 二进制
pdf_part = types.Part(
    inline_data=types.Blob(
        mime_type="application/pdf",
        data=pdf_bytes
    )
)
agent.send(pdf_part)  # Gemini 直接理解 PDF！
```

**优势：**
- ✅ 无需额外解析库
- ✅ 保留 PDF 原始布局信息
- ✅ 支持图片、表格等多模态内容
- ✅ 理解能力更强

## 数据流图

```
┌──────────────┐
│  用户上传 PDF  │
└──────┬───────┘
       │
       ↓
┌──────────────────┐
│ analyze_pdf_from_url │
│  - 下载 PDF         │
│  - 创建 Blob       │
└──────┬───────────┘
       │
       ↓
┌──────────────────┐
│  保存为 Artifact   │
│  (二进制格式)      │
└──────┬───────────┘
       │
       ↓
┌──────────────────┐
│   Gemini 模型     │
│  直接理解 PDF 内容 │
└──────┬───────────┘
       │
       ↓
┌──────────────────┐
│   回答用户问题    │
└──────────────────┘
```

## 高级用法

### 1. 对比多个 PDF

```python
# 在 test.py 中添加新工具
async def compare_pdfs(artifact_names: list[str], tool_context: ToolContext) -> dict:
    """对比多个 PDF 文档"""
    pdfs = []
    for name in artifact_names:
        artifact = await tool_context.load_artifact(name)
        if artifact:
            pdfs.append(artifact)
    
    return {
        "status": "success",
        "pdf_count": len(pdfs),
        "message": f"已加载 {len(pdfs)} 个 PDF 文档用于对比"
    }
```

### 2. 提取特定信息

```
你: 从 PDF 中提取所有作者名字和机构
AI: [使用 Gemini 的理解能力提取结构化信息]
```

### 3. 翻译 PDF 内容

```
你: 将这个英文 PDF 的摘要翻译成中文
AI: [理解 PDF 内容并翻译]
```

## 故障排查

### 问题 1: 无法下载 PDF

**原因：** URL 无效或网络问题

**解决：**
- 检查 URL 是否可访问
- 确认防火墙设置
- 尝试使用本地文件路径

### 问题 2: PDF 内容无法理解

**原因：** PDF 可能是扫描件或图片格式

**解决：**
- 确认 PDF 包含可提取的文本
- 对于扫描件，需要 OCR 处理
- 使用 Gemini Pro Vision 模型处理图片型 PDF

### 问题 3: 内存不足

**原因：** PDF 文件太大

**解决：**
```python
# 限制文件大小
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
if len(pdf_content) > MAX_FILE_SIZE:
    return {"error": "文件太大，请上传小于 10MB 的文件"}
```

## 性能优化建议

### 1. 缓存 Artifact

```python
# Artifact 会自动缓存，无需重复下载
# 第一次：下载 PDF → 保存 Artifact
# 后续：直接从 Artifact 加载
```

### 2. 分页处理

```python
# 对于超大 PDF，分页处理
async def process_pdf_pages(artifact_name: str, start_page: int, end_page: int):
    # 只处理指定页范围
    pass
```

### 3. 并行处理

```python
# 同时处理多个 PDF
import asyncio
results = await asyncio.gather(
    analyze_pdf_from_url(url1, tool_context),
    analyze_pdf_from_url(url2, tool_context),
    analyze_pdf_from_url(url3, tool_context),
)
```

## 扩展开发

### 添加新的文件格式支持

```python
# 支持 Word 文档
async def analyze_docx_from_url(url: str, tool_context: ToolContext) -> dict:
    response = requests.get(url)
    docx_part = types.Part(
        inline_data=types.Blob(
            mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            data=response.content
        )
    )
    # ... 保存逻辑
```

### 集成到生产环境

1. **使用持久化存储：**
   ```python
   from google.adk.artifacts import GcsArtifactService
   
   artifact_service = GcsArtifactService(
       bucket_name="your-bucket-name"
   )
   ```

2. **添加认证：**
   ```python
   # 在 analyze_pdf_from_url 中添加权限检查
   if not user_has_permission(tool_context):
       return {"error": "无权限访问"}
   ```

3. **监控和日志：**
   ```python
   import logging
   logging.info(f"用户 {user_id} 上传了 PDF: {url}")
   ```

## 相关资源

- [Google ADK 文档](https://ai.google.dev/adk)
- [Gemini API 文档](https://ai.google.dev/gemini-api)
- [ADK Tools 参考](https://ai.google.dev/adk/tools)

## 总结

这个测试脚本展示了：
✅ Gemini 多模态处理 PDF 的能力
✅ Artifact 机制的使用
✅ 自定义工具的开发
✅ ADK Web 界面调试方法

通过 `adk web test.py` 命令，你可以快速验证 PDF 处理功能，无需编写复杂的前端代码！

