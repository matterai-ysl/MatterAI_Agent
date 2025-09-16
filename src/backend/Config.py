#mcp_server_url = "http://47.99.180.80/"
mcp_server_url = "http://127.0.0.1"
# 预设工具配置
PRESET_TOOLS_CONFIG = {
    "preset-material-knowledge": {
        "name": "材料领域知识",
        "type": "mcp", 
        "url": f"{mcp_server_url}:8110/mcp",
        "transport": "http"
    },
    "preset-xgboost": {
        "name": "XGBoost",
        "type": "mcp",
        "url": f"{mcp_server_url}:8100/mcp", 
        "transport": "http"
    },
    "preset-material-extraction": {
        "name": "材料结构化数据提取",
        "type": "mcp",
        "url": f"{mcp_server_url}:8030/mcp",
        "transport": "http"
    },
    "preset-literature-extraction": {
        "name": "文献数据抽取",
        "type": "mcp",
        "url": f"{mcp_server_url}:8030/mcp",
        "transport": "http"
    },
    "preset-neural-network": {
        "name": "神经网络",
        "type": "mcp",
        "url": f"{mcp_server_url}:8090/mcp",
        "transport": "http"
    },
    "preset-random-forest": {
        "name": "随机森林",
        "type": "mcp",
        "url": f"{mcp_server_url}:8040/mcp",
        "transport": "http"
    },
    "preset-support-vector-machine": {
        "name": "支持向量机",
        "type": "mcp",
        "url": f"{mcp_server_url}:8050/mcp",
        "transport": "http"
    },
    "preset-vasp-calculation": {
        "name": "VASP理论计算",
        "type": "mcp",
        "url": f"{mcp_server_url}:8130/mcp",
        "transport": "http"
    },
    "preset-active-learning": {
        "name": "主动学习",
        "type": "mcp",
        "url": f"{mcp_server_url}:8080/mcp",
        "transport": "http"
    },
    "preset-automated-laboratory": {
        "name": "自动化实验室",
        "type": "mcp",
        "url": f"{mcp_server_url}:9090/mcp",
        "transport": "http"
    }
}

# MINDS 智能体专用工具配置
MINDS_TOOLS_CONFIG = {
    "preset-active-learning": {
        "name": "Active Learning",
        "type": "mcp",
        "url": f"{mcp_server_url}:8080/mcp",
        "transport": "http"
    },
    "preset-shap-analysis": {
        "name": "SHAP Analysis", 
        "type": "mcp",
        "url": f"{mcp_server_url}:8100/mcp",
        "transport": "http"
    },
    "preset-neural-network": {
        "name": "Neural Network",
        "type": "mcp",
        "url": f"{mcp_server_url}:8090/mcp",
        "transport": "http"
    },
    "preset-llm-rag": {
        "name": "LLM-RAG",
        "type": "mcp",
        "url": f"{mcp_server_url}:8110/mcp",
        "transport": "http"
    },
    "preset-automated-laboratory": {
        "name": "Automated Laboratory",
        "type": "mcp",
        "url": f"{mcp_server_url}:9090/mcp",
        "transport": "http"
    }
}

# 智能体配置
AGENT_CONFIGS = {
    "default": {
        "name": "MatterAI",
        "description": "你可靠的科研伙伴",
        "tools_config": PRESET_TOOLS_CONFIG,
        "system_prompt": """你是 MatterAI，一个专业的材料科学AI助手。你具备以下能力：

1. 材料科学基础知识和前沿研究
2. 材料设计、合成、表征和性能分析
3. 计算材料学和理论建模
4. 机器学习在材料科学中的应用
5. 工艺优化和质量控制

请用专业、准确的语言回答用户的材料科学相关问题，并在需要时使用相关工具来获取详细信息。"""
    },
    "minds": {
        "name": "MINDS",
        "description": "Material Interaction Decoupling & Scientific insight extraction",
        "tools_config": MINDS_TOOLS_CONFIG,
        "system_prompt": """You are MINDS (Material Interaction Decoupling and Scientific insight extraction), a specialized AI agent designed to bridge data-driven modeling with interpretable materials science.

Your core capabilities include:

1. **Active Learning**: Strategic sampling for efficient materials discovery
2. **SHAP Analysis**: Feature interaction analysis for materials properties
3. **Neural Network Modeling**: Deep learning approaches for materials prediction
4. **LLM-RAG**: Knowledge extraction and retrieval for materials research

You excel at:
- Decoupling complex material interactions
- Extracting scientific insights from data
- Bridging experimental and computational approaches
- Providing interpretable AI solutions for materials science

Always provide scientifically accurate responses and use the appropriate specialized modules when available. Focus on actionable insights that can guide materials research and development."""
    }
}