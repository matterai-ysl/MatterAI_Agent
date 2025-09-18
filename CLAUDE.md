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
  - PostgreSQL database for session management and user authentication
  - JWT-based authentication system
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
# Install authentication dependencies
pip install -r auth_requirements.txt

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
- **`src/components/auth/`**: Authentication system components
  - `AuthPage.tsx`: Main authentication page with view switching
  - `LoginForm.tsx`: User login interface
  - `RegisterForm.tsx`: User registration interface
  - `ChangePasswordForm.tsx`: Password change interface
  - `ProtectedRoute.tsx`: Route protection wrapper
- **`src/components/minds/`**: MINDS intelligent agent components
  - `MindsApp.tsx`: MINDS agent main container
  - `MindsWelcome.tsx`: Welcome page with module selection chips
  - `MindsChat.tsx`: MINDS-specific chat interface
- `src/contexts/AuthContext.tsx`: Authentication state management
- `src/hooks/useChat.ts`: Central chat state management with SSE handling
- `src/services/api.ts`: API client with streaming support and authentication headers
- `src/index.tsx`: Multi-agent routing configuration with authentication

### Backend Architecture
- **Authentication System**: JWT-based user authentication
  - `src/backend/auth_api/`: Authentication API routes and models
  - `src/backend/database.py`: PostgreSQL user management with bcrypt
  - JWT token-based session management
  - Protected endpoints with user ID extraction from tokens
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

### User Authentication & Security
- **JWT-based Authentication**: Secure token-based user sessions
- **User Registration & Login**: Complete authentication flow with email/password
- **Password Management**: Secure password hashing (bcrypt) and change functionality
- **Route Protection**: All chat endpoints require authentication
- **User Session Isolation**: Each user can only access their own chat data
- **Automatic Token Management**: Frontend automatically includes auth headers

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
- File upload support (external service: http://47.99.180.80/file/upload)
- Dark/light theme support

## Database Schema

The system uses a unified PostgreSQL database with two main components:

### User Authentication Schema
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Chat Session Schema (Google ADK)
The system uses Google ADK's DatabaseSessionService for session persistence, storing:
- User sessions and metadata (linked by user_id from JWT token)
- Message history with tool calls and results
- Event-driven storage for streaming reconstruction
- Multi-user session isolation and caching

## Testing

Test files are located in `src/backend/`:
- `server_test.py`: Basic server health and routing tests
- `chat_test.py`: Chat streaming and tool integration tests  
- `db_test.py`: Database connectivity and session tests
- `history_test.py`: Message history retrieval tests

## Common Tasks

### Authentication & User Management

#### Setting Up Authentication
1. **Backend Setup**:
   - Install required dependencies: `pip install -r src/backend/auth_requirements.txt`
   - Ensure database environment variables are configured
   - The system will automatically create the users table on first run

2. **Frontend Setup**:
   - Authentication is automatically integrated via `AuthProvider` in `src/index.tsx`
   - All routes except `/auth` require authentication
   - User state is managed via `useAuth` hook from `AuthContext`

#### API Endpoints
- `POST /auth/register`: User registration
- `POST /auth/login`: User login  
- `POST /auth/change-password`: Password change
- `POST /auth/verify`: Token verification
- `GET /auth/me`: Get current user info

#### Adding Authentication to New Endpoints
```python
from auth_api.auth_routes import get_current_user

@app.get("/protected-endpoint")
async def protected_route(user_id: str = Depends(get_current_user_id)):
    # user_id is automatically extracted from JWT token
    # Endpoint is protected - requires valid token
    pass
```

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
- Both MatterAI and MINDS support split-screen HTML viewing

### UI/UX Best Practices
- **Input Method Support**: Enter key is disabled for message sending to prevent IME conflicts
  - Users must click the send button (🚀) to send messages
  - Enter key is used for line breaks only
  - IME composition events are handled to prevent premature sending
- **Dialog Scrolling**: Custom tool dialogs support page-level scrolling when content overflows
- **Agent-Specific Branding**: Each agent displays its own name in chat messages (MINDS vs MatterAI)
- **Internationalization**: Full Chinese/English language switching support
  - **Language Toggle Locations**:
    - Main App: Top right corner of the title bar (next to AI status indicator)
    - MINDS App: Top right corner of navigation bar (next to settings button)
    - Sidebar: Header area (when sidebar is open)
  - Language toggle displays current language: 中 (Chinese) or EN (English)
  - Persists language preference in localStorage
  - Translates UI elements: buttons, messages, tool states, etc.
  - Default language: Chinese (zh)
  - Hover tooltip shows target language

## Internationalization (i18n) Guide

The MatterAI Agent frontend supports full internationalization with Chinese and English language switching.

### Architecture Overview

The i18n system uses `react-i18next` library with the following structure:

```
src/i18n/
├── index.ts              # Main i18n configuration
└── locales/
    ├── en.json          # English translations
    └── zh.json          # Chinese translations
```

### Language Detection Rules

- **Main App (/)**: Defaults to Chinese (zh)
- **MINDS App (/minds)**: Defaults to English (en)
- **Saved Preference**: localStorage takes priority over defaults
- **Fallback**: Chinese (zh) if no preference is found

### Adding New Translations

#### 1. Add Translation Keys

Update both language files with new keys:

**zh.json (Chinese)**:
```json
{
  "newSection": {
    "newKey": "中文文本",
    "withVariable": "包含 {{count}} 个变量"
  }
}
```

**en.json (English)**:
```json
{
  "newSection": {
    "newKey": "English text", 
    "withVariable": "Contains {{count}} variables"
  }
}
```

#### 2. Use in Components

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <span>{t('newSection.newKey')}</span>
      <span>{t('newSection.withVariable', { count: 5 })}</span>
    </div>
  );
}
```

### Translation Key Naming Convention

Use hierarchical keys with descriptive names:

- `sidebar.*` - Sidebar related text
- `chat.*` - Chat interface text  
- `tools.*` - Tool system text
- `minds.*` - MINDS agent specific text
- `common.*` - Reusable common text
- `theme.*` - Theme system text

### Language Toggle Integration

The language toggle component is available in multiple locations:

```tsx
import { LanguageToggle } from '../ui/LanguageToggle';

// Icon variant (default)
<LanguageToggle variant="icon" size="sm" />

// Text variant  
<LanguageToggle variant="text" size="md" />
```

### Best Practices

1. **Always add both languages** - Never leave a translation key in only one language
2. **Use descriptive keys** - `chat.inputPlaceholder` not `input1`  
3. **Group related keys** - Use nested objects for organization
4. **Handle pluralization** - Use interpolation for dynamic counts
5. **Test both languages** - Switch languages during development
6. **Consistent terminology** - Maintain consistent translations across the app

### Existing Translation Coverage

**Fully Translated Components**:
- Sidebar (history, search, new chat, settings)
- Chat interface (input, messages, actions)
- Tool system (selection, execution, results)
- MINDS welcome page and modules
- Language toggle and theme selector
- Message actions (copy, regenerate, ratings)
- Authentication system (login, registration, password change)

**Partially Translated**:
- Error messages and notifications
- Loading states and indicators

### Future Extension Points

To extend internationalization:

1. **Add new language**:
   - Create `src/i18n/locales/[lang].json`
   - Update `src/i18n/index.ts` resources
   - Add language option to LanguageToggle

2. **Add time/date localization**:
   - Use `i18next-luxon` or similar for date formatting
   - Configure locale-specific formats

3. **Add RTL support**:
   - Install `react-i18next` RTL plugins
   - Update CSS for RTL layouts

4. **Add context-based translations**:
   - Use `i18next` context feature for situational text
   - Implement role-based language variations

## Recent Updates (v2.1.0)

### MINDS Interface Improvements
- Removed tool selection bar from chat interface for cleaner design
- Fixed bot name display to show "MINDS" instead of "MatterAI"
- Moved module selector from popup to fixed position above input
- Added history buttons to both welcome and chat pages
- Integrated HTML split-screen functionality from MatterAI

### Input Experience Enhancements
- Completely disabled Enter key for message sending
- Fixed Chinese IME input conflicts
- Updated UI hints to reflect new keyboard behavior

### Dialog and Component Fixes
- Fixed custom tool dialog scrolling issues
- Simplified tool selector by removing redundant add buttons
- Enhanced component reusability between agents

## UI/UX Customization Updates (v2.2.0)

### Background and Branding Implementation
- **Custom Background Integration**: 
  - Added `background.png` as main chat interface background using CSS classes `.chat-background`
  - Applied to both MatterAI main application (`NewApp.tsx`) and MINDS application (`MindsApp.tsx`)
  - Implemented fixed background attachment for consistent visual experience

- **Header Background Styling**:
  - Added `header.png` as header background using CSS class `.header-background`
  - Applied to all top navigation bars across MatterAI and MINDS interfaces
  - Covers main app title bar, MINDS chat header, and MINDS welcome page header

- **Logo Integration**:
  - Added institute logo (`institute-logo.png`) to center position of all header bars
  - Responsive logo sizing: h-8 for main applications, h-7 for MINDS chat interface
  - Proper image path configuration using public assets directory structure

### Color Scheme Adaptation
- **Text Color Adjustment**:
  - Updated all header text colors from white to custom RGB(0, 103, 112) for better contrast
  - Applied consistent color scheme across all navigation elements
  - Used opacity variants for secondary text (0.7) and interactive elements (0.8)

- **Interactive Element Updates**:
  - Modified hover effects to use `bg-teal-900/20` instead of white transparencies
  - Updated button states and icon colors to match new color scheme
  - Maintained accessibility standards for contrast ratios

### Component-Specific Changes
- **MatterAI Main App** (`src/frontend/src/NewApp.tsx`):
  - Applied chat background and header background
  - Added centered logo in title bar
  - Updated all text colors and interactive elements

- **MINDS Chat Interface** (`src/frontend/src/components/minds/MindsChat.tsx`):
  - Applied header background with institute logo
  - Updated color scheme for all text elements
  - Added language toggle functionality consistency

- **MINDS Welcome Page** (`src/frontend/src/components/minds/MindsWelcome.tsx`):
  - Applied header background with institute logo
  - Added missing language toggle button for feature parity
  - Updated color scheme to match other interfaces

### Technical Implementation
- **Asset Management**:
  - Images stored in both `src/assets/images/` and `public/assets/images/`
  - CSS background images use relative paths: `url('./assets/images/filename.png')`
  - React img tags use absolute paths: `/assets/images/filename.png`

- **CSS Enhancements**:
  - Added new utility classes in `src/frontend/src/index.css`
  - Implemented responsive background sizing and positioning
  - Maintained cross-browser compatibility

### Quality Assurance
- **Code Cleanup**:
  - Resolved ESLint warnings for unused variables
  - Fixed TypeScript type issues
  - Ensured consistent code formatting

- **Testing and Validation**:
  - Verified frontend compilation without errors
  - Tested responsive design across different screen sizes
  - Confirmed functionality across both MatterAI and MINDS interfaces

## Recent Updates (v2.3.0)

### JWT Authentication System Integration
- **Complete Authentication Flow**: Implemented full user registration, login, and password management
- **Database Integration**: Added PostgreSQL user table with secure bcrypt password hashing
- **Token-based Security**: All chat endpoints now require JWT authentication
- **User Session Isolation**: Each user can only access their own chat data and sessions
- **Frontend Integration**: Automatic token management and route protection
- **API Modernization**: Removed hardcoded user IDs, now extracted from JWT tokens
- **Security Enhancements**: 
  - Protected routes with authentication middleware
  - Secure password storage with bcrypt
  - Token expiration and validation
  - User-specific data access control

### Authentication System Components
- **Backend**: 
  - `src/backend/auth_api/`: Complete authentication API
  - `src/backend/database.py`: User management with PostgreSQL
  - JWT token extraction in `main.py`
  - Protected endpoints for all chat functionality
- **Frontend**:
  - `src/components/auth/`: Login, registration, and password change forms
  - `src/contexts/AuthContext.tsx`: Authentication state management
  - `ProtectedRoute` component for route security
  - Automatic authentication headers in API calls

### Technical Improvements
- **Code Quality**: Fixed all TypeScript compilation errors and warnings
- **API Consistency**: Updated all endpoints to use authenticated user IDs
- **Type Safety**: Removed hardcoded user ID from frontend types
- **Database Schema**: Unified database for both authentication and chat data
- **Error Handling**: Comprehensive error handling for authentication flows

## Recent Updates (v2.4.0)

### File Upload Service Migration
- **External Upload Service**: Migrated file upload functionality to dedicated public server
- **API Endpoint**: Files now uploaded to `http://47.99.180.80/file/upload`
- **Supported File Types**: csv, doc, docx, gif, jpeg, jpg, pdf, png, rar, txt, xls, xlsx, zip
- **Response Format Adaptation**: Frontend adapted to handle new API response format
- **Backend Cleanup**: Removed local upload endpoint and static file serving
- **Scalability Improvement**: External service provides better performance and scalability

### File Upload Technical Details
- **Single File Response**:
  ```json
  {
    "success": true,
    "url": "http://47.99.180.80/file/uploads/filename.ext",
    "filename": "filename.ext",
    "original_filename": "filename.ext",
    "size": 1024,
    "upload_time": "2023-12-01T10:30:00.123456"
  }
  ```
- **Multiple Files Response**:
  ```json
  {
    "files": [
      {
        "success": true,
        "url": "http://47.99.180.80/file/uploads/file1.ext",
        "filename": "file1.ext",
        "original_filename": "file1.ext",
        "size": 1024,
        "upload_time": "2023-12-01T10:30:00.123456"
      }
    ]
  }
  ```
- **Frontend Integration**: Seamless transition with no changes required to UI components
- **Error Handling**: Proper handling of unsupported file types and upload failures

## Deployment Notes

- Frontend builds to static files in `build/` directory
- Backend runs on port 9000 with CORS enabled
- Requires PostgreSQL database connection with authentication tables
- Install additional dependencies: `pip install -r src/backend/auth_requirements.txt`
- MCP tools run as separate services on different ports
- Environment variables now include database credentials for user authentication

## Troubleshooting

### Google ADK Version Compatibility Issues

**Problem**: Database errors like `column events.custom_metadata does not exist` when using the same cloud database between local and server environments.

**Root Cause**: Different versions of Google ADK create different database table structures. Newer versions add fields like `custom_metadata` to the `events` table that older versions don't recognize.

**Symptoms**:
- Local environment works fine
- Server environment throws `psycopg2.errors.UndefinedColumn` errors
- Both environments use the same cloud PostgreSQL database

**Solution**:
1. **Check ADK versions** on both environments:
   ```bash
   pip show google-adk
   ```

2. **Ensure version consistency** - use the same Google ADK version across all environments:
   ```bash
   pip install google-adk==1.8.0  # Use specific version
   ```

3. **If downgrading server**: The database tables created by newer ADK versions are backward compatible, but newer fields won't be used.

4. **If upgrading local**: The ADK will automatically add missing columns to existing tables.

**Prevention**:
- Pin Google ADK version in `requirements.txt`
- Use consistent Python environments across local and server deployments
- Test database schema changes in staging before production deployment

**Alternative Manual Fix** (if version sync is not possible):
```sql
-- Add missing column manually
ALTER TABLE events ADD COLUMN IF NOT EXISTS custom_metadata JSONB;
```