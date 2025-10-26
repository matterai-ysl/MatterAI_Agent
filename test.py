"""
ADK Web 调试脚本 - Gemini 多模态 PDF 处理测试

运行方式：
1. 确保已安装依赖：pip install google-adk requests
2. 配置 .env 文件中的 API Key
3. 运行：adk web test.py
4. 在浏览器中打开显示的 URL 进行测试

测试方法：
- 在 Web 界面上传 PDF 文件
- 询问文件内容相关的问题
- Agent 会直接使用 Gemini 的多模态能力处理 PDF
"""

from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.artifacts import InMemoryArtifactService
from google.adk.tools import load_artifacts, ToolContext
from google.genai import types
from dotenv import load_dotenv
import os
import requests
import io
from typing import Optional

# 加载环境变量
load_dotenv(override=True)

# 配置 Gemini 模型
model = LiteLlm(
    model="openai/gpt-4o",  # 根据您的配置
    api_base=os.getenv("BASE_URL"),
    api_key=os.getenv("OPENAI_API_KEY")
)

# 如果使用 Google Gemini 模型，使用以下配置：
# from google.adk.models import GeminiModel
# model = GeminiModel(
#     model="gemini-1.5-pro",  # 或 gemini-1.5-flash
#     api_key=os.getenv("GOOGLE_API_KEY")
# )


async def analyze_pdf_from_url(url: str, tool_context: ToolContext) -> dict:
    """
    从 URL 下载 PDF 并分析内容
    
    Args:
        url: PDF 文件的 URL
        tool_context: ADK 工具上下文
    
    Returns:
        包含 PDF 分析结果的字典
    """
    print(f"📥 正在下载 PDF: {url}")
    
    try:
        # 下载 PDF
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        pdf_content = response.content
        
        print(f"✅ PDF 下载成功，大小: {len(pdf_content)} 字节")
        
        # 保存为 Artifact（二进制格式）
        artifact_name = f"pdf_{hash(url)}"
        pdf_part = types.Part(
            inline_data=types.Blob(
                mime_type="application/pdf",
                data=pdf_content
            )
        )
        
        version = await tool_context.save_artifact(artifact_name, pdf_part)
        print(f"💾 PDF 已保存为 Artifact: {artifact_name} (版本: {version})")
        
        return {
            "status": "success",
            "message": f"PDF 已成功加载并保存为 Artifact: {artifact_name}",
            "artifact_name": artifact_name,
            "file_size": len(pdf_content),
            "version": version,
            "url": url
        }
        
    except Exception as e:
        print(f"❌ 处理 PDF 时出错: {str(e)}")
        return {
            "status": "error",
            "message": f"处理 PDF 失败: {str(e)}",
            "url": url
        }


async def extract_pdf_info(artifact_name: str, tool_context: ToolContext) -> dict:
    """
    从 Artifact 加载 PDF 并提取基本信息
    
    Args:
        artifact_name: Artifact 名称
        tool_context: ADK 工具上下文
    
    Returns:
        PDF 信息
    """
    print(f"📂 正在加载 Artifact: {artifact_name}")
    
    try:
        # 从 Artifact 加载 PDF
        artifact = await tool_context.load_artifact(artifact_name)
        
        if artifact is None:
            return {
                "status": "error",
                "message": f"未找到 Artifact: {artifact_name}"
            }
        
        # 获取 PDF 数据
        if hasattr(artifact, 'inline_data') and artifact.inline_data:
            pdf_data = artifact.inline_data.data
            if pdf_data is None:
                return {
                    "status": "error",
                    "message": "Artifact 数据为空"
                }
            
            file_size = len(pdf_data)
            
            # 如果需要提取文本，可以使用 PyPDF2
            try:
                from PyPDF2 import PdfReader  # type: ignore
                pdf_reader = PdfReader(io.BytesIO(pdf_data))
                page_count = len(pdf_reader.pages)
                
                # 提取前几页的文本作为预览
                preview_text = ""
                for i, page in enumerate(pdf_reader.pages[:3]):  # 只提取前3页
                    preview_text += f"\n--- 第 {i+1} 页 ---\n"
                    preview_text += page.extract_text()
                
                return {
                    "status": "success",
                    "artifact_name": artifact_name,
                    "file_size": file_size,
                    "page_count": page_count,
                    "preview": preview_text[:1000],  # 只返回前1000字符
                    "message": f"PDF 包含 {page_count} 页，总大小 {file_size} 字节"
                }
            except ImportError:
                # 如果没有 PyPDF2，只返回基本信息
                return {
                    "status": "success",
                    "artifact_name": artifact_name,
                    "file_size": file_size,
                    "message": "PDF 已加载（需要 PyPDF2 提取详细信息）"
                }
        else:
            return {
                "status": "error",
                "message": "Artifact 不包含有效的 PDF 数据"
            }
            
    except Exception as e:
        print(f"❌ 提取 PDF 信息时出错: {str(e)}")
        return {
            "status": "error",
            "message": f"提取信息失败: {str(e)}"
        }


# 系统提示词
SYSTEM_PROMPT = """你是一个专业的 PDF 文档分析助手。

你的能力：
1. 可以直接理解和分析 PDF 文档内容
2. 可以回答关于 PDF 的任何问题
3. 可以提取、总结和分析 PDF 中的信息

当用户上传 PDF 文件时：
1. 使用 analyze_pdf_from_url 工具下载并保存 PDF
2. PDF 会被保存为 Artifact，你可以直接访问其内容
3. 你可以使用 load_artifacts 工具重新加载之前的 PDF
4. 使用 extract_pdf_info 工具可以获取 PDF 的基本信息

回答问题时：
- 准确引用 PDF 中的内容
- 如果内容不在 PDF 中，明确说明
- 可以总结、分析、对比 PDF 内容
- 支持中英文交流

注意：
- 用户可能会给你 PDF 的 URL，请使用 analyze_pdf_from_url 工具处理
- 保持回答准确、专业、有条理
"""

# 创建 Agent，包含 PDF 处理工具
agent = LlmAgent(
    name="pdf_analyzer",
    model=model,
    instruction=SYSTEM_PROMPT,
    tools=[
        load_artifacts,  # ADK 内置工具
        analyze_pdf_from_url,  # 自定义工具：分析 PDF
        extract_pdf_info,  # 自定义工具：提取 PDF 信息
    ],
)

# 创建 Runner
runner = Runner(
    agent=agent,
    app_name="pdf_test_app",
    session_service=InMemorySessionService(),
    artifact_service=InMemoryArtifactService()
)

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 ADK Web 调试 - Gemini 多模态 PDF 处理测试")
    print("=" * 60)
    print()
    print("📋 使用说明：")
    print("1. 运行命令：adk web test.py")
    print("2. 在浏览器打开显示的 URL")
    print("3. 测试方式 A：直接在聊天中发送 PDF URL")
    print("   例如：请分析这个 PDF：https://example.com/paper.pdf")
    print()
    print("4. 测试方式 B：使用 Web 界面的文件上传功能")
    print("   - 上传 PDF 文件")
    print("   - 询问文件相关问题")
    print()
    print("5. 示例问题：")
    print("   - 这篇论文的主要内容是什么？")
    print("   - 总结文档的关键结论")
    print("   - 文档中提到了哪些重要数据？")
    print()
    print("=" * 60)
    print("⚙️  当前配置：")
    print(f"   模型: {model.model}")
    print(f"   API Base: {os.getenv('BASE_URL', '未设置')}")
    print(f"   工具数量: {len(agent.tools)}")
    print("=" * 60)

