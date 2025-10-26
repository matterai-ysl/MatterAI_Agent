import mimetypes
import os
import io
from pathlib import Path
from typing import Any
from google.adk.models.lite_llm import LiteLlm
from dotenv import load_dotenv
from google.adk.agents import LlmAgent
from google.adk.artifacts import InMemoryArtifactService
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools import BaseTool  # Use custom implementation
from google.adk.tools.tool_context import ToolContext
from google.adk.models.llm_request import LlmRequest
from google.genai import types
import pdfplumber
import pandas as pd
import base64
import json
from Config import model
CURRENT_MODEL_NAME = model

def is_gemini_model(model_name=CURRENT_MODEL_NAME) -> bool:
    """Check if the model is a Gemini model

    Args:
        model_name: Model name

    Returns:
        Returns True if it's a Gemini model, otherwise False
    """
    model_lower = model_name.lower()
    return 'gemini' in model_lower or model_lower.startswith('gemini/')
async def save_file_to_artifact(path: str, filename: str = "", tool_context=None) -> dict:
    """Save file to artifact storage for the agent to examine and analyze later.
    
    PURPOSE: Use this to prepare files for YOUR inspection and reasoning, NOT for passing to other computational or machine learning tools.
    
    WHEN TO USE:
    - User asks you to "look at", "examine", "check", or "analyze" a file
    - You need to understand the file content before proceeding
    - User wants you to summarize or describe file contents
    
    WHEN NOT TO USE:
    - Other tools can read the file format directly (e.g., ML tools reading CSV/Excel)
    - User asks to "train", "predict", "fit", or run computational analysis
    - The file will be passed directly to another tool as input
    
    SUPPORTED FORMATS: Images (PNG/JPG/GIF/WEBP), PDFs, Excel/CSV files
    
    INPUT: 
    - Local file path: /path/to/file.pdf
    - Remote URL: https://example.com/file.xlsx
    
    OUTPUT:
    - Returns {"artifactname": "original_path", "version": 0}
    - The artifactname is the same as the input path
    - Use the returned artifactname with load_artifacts_file() to access the saved file

    WORKFLOW:
    1. save_file_to_artifact() → stores file
    2. load_artifacts_file() → loads for YOUR analysis
    3. You examine and reason about the content

    Args:
        path: File path (local or URL) to save
        filename: Optional custom name for the artifact (default: auto-generated from path)

    Returns:
        dict: {"artifactname": str, "version": int} to reference the saved artifact

    Example:
        # Correct usage
        result = await save_file_to_artifact("http://example.com/data/experiment.csv")
        # Returns: {"artifactname": "http://example.com/data/experiment.csv", "version": 0}
        # Then load to examine: load_artifacts_file(result["artifactname"])
        
        # Incorrect usage  
        # Don't do: save_file_to_artifact() then pass to ML tool
        # Instead: pass file path directly to ML tool if it accepts CSV/Excel
    """
    print("--------------------------------")
    print(f"Saving file: {path}")
    print("--------------------------------")
    if not path:
        return {"status": "error", "message": "Path is required"}

    try:
        # Store original path as artifactname
        original_path = path

        # 判断是 URL 还是本地路径
        if path.startswith(("http://", "https://")):
            # URL: 下载文件
            import aiohttp
            async with aiohttp.ClientSession() as session:
                async with session.get(path) as response:
                    if response.status != 200:
                        return {"status": "error", "message": f"Failed to download: {response.status}"}
                    file_bytes = await response.read()
                    mime_type, _ = mimetypes.guess_type(path)
                    if not filename:
                        filename = Path(path).name
        else:
            # 本地路径: 读取文件
            file_path = Path(path)
            if not file_path.exists():
                return {"status": "error", "message": f"File not found: {path}"}

            with open(file_path, "rb") as f:
                file_bytes = f.read()

            mime_type, _ = mimetypes.guess_type(str(file_path))
            if not filename:
                filename = file_path.name

        # 确定 MIME 类型
        if not mime_type:
            ext = Path(filename).suffix.lower()
            mime_map = {
                '.pdf': 'application/pdf',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                '.xls': 'application/vnd.ms-excel',
                '.csv': 'text/csv'
            }
            mime_type = mime_map.get(ext, 'application/octet-stream')

        # Get current model name
        global CURRENT_MODEL_NAME
        model_name = CURRENT_MODEL_NAME
        is_gemini = is_gemini_model(model_name)

        print(f"Detected model: {model_name} (Gemini: {is_gemini})")

        # 🔑 New: Check if it's an image file
        is_image = mime_type.startswith('image/')
        
        # Process PDF file: Decide whether to convert based on model type
        is_pdf = mime_type == 'application/pdf' or Path(filename).suffix.lower() == '.pdf'
        if is_pdf and not is_gemini:
            # Non-Gemini model: Convert PDF to text
            print("Non-Gemini model detected, converting PDF to text...")
            try:
                with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                    full_text = ""
                    for page in pdf.pages:
                        text = page.extract_text()
                        if text:
                            full_text += text + "\n"

                if full_text.strip():
                    file_bytes = full_text.encode('utf-8')
                    original_filename = filename
                    mime_type = 'text/plain'
                    print(f"PDF converted to text: {original_filename} -> {filename}")
                    print(f"Extracted {len(full_text)} characters")
                else:
                    print("Warning: No text extracted from PDF, falling back to original PDF")
            except Exception as e:
                print(f"Warning: Failed to convert PDF to text: {e}")
                print("Falling back to original PDF")
        elif is_pdf:
            print("Gemini model detected, saving PDF natively...")

        # Process Excel/CSV files: Convert to formatted text
        file_ext = Path(filename).suffix.lower()
        is_excel_csv = file_ext in ['.xlsx', '.xls', '.csv']

        if is_excel_csv and not is_gemini:
            # Non-Gemini model: Convert Excel/CSV to formatted text
            print(f"Non-Gemini model detected, converting {file_ext} to formatted text...")
            try:
                # Read file
                if file_ext == '.csv':
                    df = pd.read_csv(io.BytesIO(file_bytes))
                else:  # .xlsx or .xls
                    df = pd.read_excel(io.BytesIO(file_bytes))

                # Generate formatted text representation
                text_parts = []
                text_parts.append(f"Data file: {filename}")
                text_parts.append(f"Number of rows: {len(df)}, Number of columns: {len(df.columns)}")
                text_parts.append(f"\nColumn names: {', '.join(df.columns.tolist())}")
                text_parts.append("\n" + "="*80)
                text_parts.append("\nData preview (first 5 rows):\n")

                # Use to_string to generate table
                preview = df.head(5).to_string(index=True, max_rows=5, max_cols=None)
                text_parts.append(preview)

                # Add statistical information
                text_parts.append("\n\n" + "="*80)
                text_parts.append("\nData statistics:\n")
                text_parts.append(df.describe(include='all').to_string())

                full_text = "\n".join(text_parts)

                # Save as text file
                file_bytes = full_text.encode('utf-8')
                original_filename = filename
                mime_type = 'text/plain'
                print(f"{file_ext.upper()} converted to text: {original_filename} -> {filename}")
                print(f"Generated {len(full_text)} characters from {len(df)} rows")

            except Exception as e:
                print(f"Warning: Failed to convert {file_ext} to text: {e}")
                print(f"Falling back to original {file_ext}")
        elif is_excel_csv:
            print("Gemini model detected, saving Excel/CSV natively...")

        # Validate data is not empty
        if not file_bytes:
            return {"status": "error", "message": "File data is empty"}

        # 🔑 Key modification: Decide save format based on model type and file type
        if is_gemini or is_image:
            # Gemini model or image file: Save Part object (original format)
            artifact = types.Part.from_bytes(data=file_bytes, mime_type=mime_type)

            if not artifact or not hasattr(artifact, 'inline_data') or not artifact.inline_data:
                return {"status": "error", "message": "Failed to create valid Part object"}

            if not artifact.inline_data.data:
                return {"status": "error", "message": "Part object has empty data"}

            storage_reason = "Gemini model" if is_gemini else "image file"
            print(f"Created Part for {storage_reason}: mime_type={artifact.inline_data.mime_type}, data_size={len(artifact.inline_data.data)}")

            version = await tool_context.save_artifact(filename=filename, artifact=artifact) # type: ignore
            print(f"File '{filename}' saved as Part object (version {version})")

            return {
                "status": "success",
                "artifactname": original_path,
                "version": version,
                "message": f"File saved successfully. Use artifactname '{original_path}' with load_artifacts_file tool to access it."
            }
        
        else:
            # Non-Gemini model and non-image file: Save decoded content (text or base64)
            content_dict = {
                "filename": filename,
                "mime_type": mime_type,
                "size": len(file_bytes),
            }

            # Text file: Decode directly
            if mime_type.startswith('text/') or mime_type in ['application/json', 'application/xml']:
                try:
                    text_content = file_bytes.decode('utf-8')
                    content_dict["content_type"] = "text"
                    content_dict["content"] = text_content
                    print(f"Decoded text content: {len(text_content)} characters")
                except UnicodeDecodeError as e:
                    return {"status": "error", "message": f"Failed to decode text: {e}"}

            # Other binary files: base64 encoding
            else:
                base64_content = base64.b64encode(file_bytes).decode('utf-8')
                content_dict["content_type"] = "base64"
                content_dict["content"] = base64_content
                print(f"Encoded binary content as base64: {len(base64_content)} characters")

            # Convert content dictionary to JSON and save with internal filename
            internal_filename = f"{Path(filename).stem}_content.json"
            json_content = json.dumps(content_dict, ensure_ascii=False, indent=2)
            json_artifact = types.Part.from_text(text=json_content) # type: ignore

            if not json_artifact or not hasattr(json_artifact, 'text') or not json_artifact.text:
                return {"status": "error", "message": "Failed to create JSON artifact"}

            version = await tool_context.save_artifact(filename=internal_filename, artifact=json_artifact) # type: ignore
            print(f"File content saved as JSON: {internal_filename} (version {version})")

            return {
                "status": "success",
                "artifactname": original_path,
                "version": version,
                "message": f"File saved successfully. Use artifactname '{original_path}' with load_artifacts_file tool to access it."
            }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": f"Error: {str(e)}"}


class LoadArtifactsFileTool(BaseTool):
    """Load saved artifact files by filename and optional version number"""

    def __init__(self):
        super().__init__(
            name='load_artifacts_file',
            description='Loads a saved artifact file by filename and optionally version number.',
        )
        self._loaded_artifact_name = None  # Temporarily store the artifact name to load

    def _get_declaration(self) -> types.FunctionDeclaration | None:
        return types.FunctionDeclaration(
            name=self.name,
            description=self.description,
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    'filename': types.Schema(
                        type=types.Type.STRING,
                        description='The artifact filename to load',
                    ),
                    'version': types.Schema(
                        type=types.Type.INTEGER,
                        description='Optional version number (defaults to latest)',
                    ),
                },
                required=['filename'],
            ),
        )

    async def run_async(self, *, args: dict[str, Any], tool_context: ToolContext) -> Any:
        """Execute tool: Load artifact and return status information"""
        artifactname = args.get('filename')  # This could be a full path or just filename
        version = args.get('version')

        print("--------------------------------")
        print(f"Loading artifact: {artifactname}, version: {version if version is not None else 'latest'}")
        print("--------------------------------")

        if not artifactname:
            return {"status": "error", "message": "Filename is required"}

        try:
            # Extract filename from path (handles both URLs and local paths)
            if artifactname.startswith(("http://", "https://", "/")):
                filename = Path(artifactname).name
                print(f"Extracted filename from path: {filename}")
            else:
                filename = artifactname

            # Try to load artifact with extracted filename first
            if version is not None:
                artifact = await tool_context.load_artifact(filename=filename, version=version)
            else:
                artifact = await tool_context.load_artifact(filename=filename)

            # If not found, try internal format (e.g., _content.json)
            if not artifact:
                internal_filename = f"{Path(filename).stem}_content.json"
                print(f"Original filename not found, trying internal format: {internal_filename}")
                if version is not None:
                    artifact = await tool_context.load_artifact(filename=internal_filename, version=version)
                else:
                    artifact = await tool_context.load_artifact(filename=internal_filename)

            if not artifact:
                return {"status": "error", "message": f"Artifact '{artifactname}' not found"}

            # Check if it's an image
            is_image = False
            if hasattr(artifact, 'inline_data') and artifact.inline_data:
                mime_type = artifact.inline_data.mime_type
                data_size = len(artifact.inline_data.data) if artifact.inline_data.data else 0
                is_image = mime_type is not None and mime_type.startswith('image/')
                print(f"Artifact loaded with inline_data: mime_type={mime_type}, size={data_size} bytes, is_image={is_image}")


                # Store filename for use by process_llm_request
                self._loaded_artifact_name = filename if is_image else None

                return {
                    "status": "success",
                    "artifactname": artifactname,
                    "message": f"Artifact loaded successfully" if is_image else f"Artifact content is available",
                    "is_image": is_image
                }
            else:
                print(f"Artifact loaded (text type): {filename}")
                return artifact
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {"status": "error", "message": f"Error loading artifact: {str(e)}"}

    async def process_llm_request(self, *, tool_context: ToolContext, llm_request: LlmRequest) -> None:
        """Add image content directly to request before sending to LLM"""
        await super().process_llm_request(tool_context=tool_context, llm_request=llm_request)

        # Check if there's an image to load
        if llm_request.contents and llm_request.contents[-1].parts:
            function_response = llm_request.contents[-1].parts[0].function_response
            if function_response and function_response.name == 'load_artifacts_file':
                response_data = function_response.response

                # If it's an image, add it directly to LLM request
                if response_data is not None and response_data.get('is_image') and response_data.get('artifactname'):
                    filename = response_data['artifactname']
                    print(f"[process_llm_request] Adding image artifact '{filename}' to LLM request")

                    # Load artifact
                    artifact = await tool_context.load_artifact(filename)

                    if artifact:
                        # Add image content to request
                        llm_request.contents.append(
                            types.Content(
                                role='user',
                                parts=[
                                    types.Part.from_text(text=f"Artifact {filename} is:"),
                                    artifact,  # Image Part object
                                ],
                            )
                        )
                        print(f"[process_llm_request] Image artifact '{filename}' added to LLM request")
                    else:
                        print(f"[process_llm_request] Warning: Could not load artifact '{filename}'")

# Create tool instance
load_artifacts_file = LoadArtifactsFileTool()