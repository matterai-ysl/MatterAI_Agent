# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MatterAI Agent is a materials science-focused AI assistant with a React + TypeScript frontend and FastAPI Python backend. The system features a **multi-agent architecture** supporting specialized intelligent agents, including the flagship MINDS (Material Interaction Decoupling & Scientific insight extraction) agent. The system uses session-based conversations with streaming responses and integrates Material Characterization Protocol (MCP) tools for specialized materials science capabilities.

## Architecture

- **Frontend**: React 18 + TypeScript in `src/frontend/`
  - Built with Create React App
  - Tailwind CSS for styling
  - React Router for multi-agent routing
  - React Markdown with syntax highlighting
  - SSE (Server-Sent Events) for real-time streaming
  - Responsive design with mobile-first approach

- **Backend**: FastAPI in `src/backend/main.py`
  - Google ADK (Agent Development Kit) integration
  - PostgreSQL database for session management
  - MCP tools integration for materials science workflows
  - **Multi-agent architecture** with app_name differentiation
  - Dynamic agent creation with tool selection

## Development Commands

### Frontend (src/frontend/)
```bash
# Install dependencies
npm install

# Start development server (runs on port 3000, proxies to backend on port 9000)
npm start

# Build for production
npm run build

# Run tests
npm test
```

### Backend (src/backend/)
```bash
# Start backend server (runs on port 9000)
python main.py

# Run individual test files
python server_test.py
python chat_test.py
python db_test.py
python history_test.py
```

## Environment Setup

Required environment variables:
- `OPENAI_API_KEY`: OpenAI API key for LLM
- `BASE_URL`: LLM API base URL
- `DB_HOST`: PostgreSQL host
- `DB_NAME`: Database name  
- `DB_USER`: Database user
- `DB_PASSWORD`: Database password

## Key Components

### Frontend Architecture
- `src/components/chat/`: Chat interface components (ChatPanel, MessageList, ChatInput)
- `src/components/sidebar/`: Session management (Sidebar, SessionList)
- `src/components/tools/`: Tool selection and display (ToolSelector, ToolDisplay)
- `src/components/viewer/`: HTML report viewer with iframe rendering
- **`src/components/minds/`**: MINDS intelligent agent components
  - `MindsApp.tsx`: MINDS agent main container
  - `MindsWelcome.tsx`: Welcome page with module selection chips
  - `MindsChat.tsx`: MINDS-specific chat interface
- `src/hooks/useChat.ts`: Central chat state management with SSE handling
- `src/services/api.ts`: API client with streaming support
- `src/index.tsx`: Multi-agent routing configuration

### Backend Architecture
- **Multi-Agent System**: Agent differentiation via app_name parameter
  - Default agent: General MatterAI functionality
  - MINDS agent: Specialized materials science modules
- **Session Management**: Multi-user session isolation with caching
- **Dynamic Agents**: Runtime tool selection and agent configuration
- **MCP Integration**: HTTP and SSE transport for external tools
- **Streaming**: Real-time SSE responses with delta, tool_call, tool_result events

### Tool System
- **Preset Tools**: Configured in `src/backend/Config.py`
  - **Default Tools**: Material Knowledge, XGBoost, Material Extraction
  - **MINDS Tools**: Active Learning, SHAP Analysis, Neural Network, LLM-RAG
- **Multi-Agent Tool Configuration**: Agent-specific tool mappings via `AGENT_CONFIGS`
- **Custom Tools**: User-defined MCP tools with HTTP/SSE transport
- **HTML Reports**: Tools can generate HTML reports displayed in split-screen view

## Key Features

### Multi-Agent Architecture
- **Route-based Agent Access**: Default agent at `/`, MINDS agent at `/minds`
- **Agent-Specific Tool Configuration**: Each agent has its own preset tool set
- **Unified Backend**: Single backend instance serving multiple specialized agents
- **Component Reusability**: Shared UI components across different agents

### Streaming Chat
- SSE-based real-time message streaming
- Event types: `meta`, `delta`, `tool_call`, `tool_result`, `done`, `error`
- Automatic session creation and management

### Tool Integration
- Dynamic tool selection per conversation
- MCP (Material Characterization Protocol) tool support
- HTML report generation with split-screen viewing
- Tool execution state display with collapsible details

### Session Management
- User-isolated sessions with caching
- Agent reuse for identical tool configurations
- Automatic cleanup of idle sessions (30-minute timeout)

### UI/UX
- Claude/ChatGPT-style interface
- Markdown rendering with syntax highlighting
- Mobile-responsive design
- File upload support
- Dark/light theme support

## Database Schema

The system uses Google ADK's DatabaseSessionService for session persistence, storing:
- User sessions and metadata
- Message history with tool calls and results
- Event-driven storage for streaming reconstruction

## Testing

Test files are located in `src/backend/`:
- `server_test.py`: Basic server health and routing tests
- `chat_test.py`: Chat streaming and tool integration tests  
- `db_test.py`: Database connectivity and session tests
- `history_test.py`: Message history retrieval tests

## Common Tasks

### Adding New Intelligent Agents
1. **Backend Configuration**:
   - Add new agent configuration to `AGENT_CONFIGS` in `src/backend/Config.py`
   - Create agent-specific tool configuration (e.g., `NEW_AGENT_TOOLS_CONFIG`)
   - Define agent name and system prompt

2. **Frontend Implementation**:
   - Create new agent components in `src/components/[agent-name]/`
   - Add route to `src/index.tsx` (e.g., `/new-agent`)
   - Implement agent-specific UI while reusing core components:
     - Reuse: `Sidebar`, `MessageList`, `ChatInput`, `useChat` hook
     - Create: Agent-specific welcome page and main container

3. **Update ChatRequest**: Add app_name parameter support in frontend API calls

### Adding New Preset Tools
1. Update relevant `*_TOOLS_CONFIG` in `src/backend/Config.py`
2. Add tool selection option in frontend `ToolSelector` component
3. Restart backend to load new configuration

### Debugging SSE Streaming
- Enable debug mode: `localStorage.setItem('debug', 'true')` in browser console
- Check backend logs for tool execution status
- Verify MCP tool server connectivity

### HTML Report Integration
- Tools should return `*_html_path` or `*_url` in results
- Local files served via `/html-content` endpoint
- External URLs loaded directly in iframe

## Deployment Notes

- Frontend builds to static files in `build/` directory
- Backend runs on port 9000 with CORS enabled
- Requires PostgreSQL database connection
- MCP tools run as separate services on different ports