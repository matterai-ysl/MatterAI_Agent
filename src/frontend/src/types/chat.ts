/**
 * 聊天相关的类型定义
 * 包含消息、会话、工具调用等核心数据结构
 */

/**
 * 消息角色类型
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * 工具调用信息
 */
export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
  timestamp: number;
}

/**
 * 工具调用结果
 */
export interface ToolResult {
  id: string;
  name: string;
  result: any;
  timestamp: number;
}

/**
 * 消息内容类型
 */
export interface MessageContent {
  type: 'text' | 'file' | 'image';
  text?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
}

/**
 * 聊天消息基础接口
 */
export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: MessageContent[];
  timestamp: number;
  sessionId: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  isStreaming?: boolean;
  error?: string;
}

/**
 * 会话信息
 */
export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  preview?: string;
}

/**
 * SSE 事件类型
 */
export type SSEEventType = 'meta' | 'delta' | 'tool_call' | 'tool_result' | 'done' | 'error';

/**
 * SSE 事件数据结构
 */
export interface SSEEvent {
  type: SSEEventType;
  data?: any;
  // meta 事件
  session_id?: string;
  // delta 事件
  text?: string;
  // tool_call 事件
  name?: string;
  args?: Record<string, any>;
  // tool_result 事件
  result?: any;
  // error 事件
  error?: string;
}

/**
 * 聊天请求参数
 */
export interface CustomToolConfig {
  url: string;
  transport: string; // "http" 或 "sse"
}

export interface ChatRequest {
  // user_id 现在从JWT token获取，不再需要在请求中发送
  query: string;
  session_id?: string;
  selected_tools?: string[];
  custom_tools?: CustomToolConfig[];
  app_name?: string;
  file_urls?: string[]; // 文件地址列表
  language?: string; // 语言设置
}

/**
 * API 响应基础接口
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 会话列表响应
 */
export interface SessionListResponse {
  sessions: string[];
}

/**
 * 历史消息响应
 */
export interface HistoryResponse {
  session_id: string;
  messages: Array<{
    role: string | null;
    text?: string; // 兼容旧格式
    content?: MessageContent[]; // 新格式
    toolCalls?: ToolCall[];
    toolResults?: ToolResult[];
    timestamp?: number;
  }>;
}

/**
 * 单个文件上传结果
 */
export interface FileUploadResult {
  success: boolean;
  url: string;
  filename: string;
  original_filename: string;
  size: number;
  upload_time: string;
}

/**
 * 文件上传响应 - 单个文件
 */
export interface SingleFileUploadResponse {
  success: boolean;
  url: string;
  filename: string;
  original_filename: string;
  size: number;
  upload_time: string;
}

/**
 * 文件上传响应 - 多个文件
 */
export interface MultipleFileUploadResponse {
  files: FileUploadResult[];
}

/**
 * 文件上传响应联合类型
 */
export type FileUploadResponse = SingleFileUploadResponse | MultipleFileUploadResponse;

/**
 * 应用状态接口
 */
export interface AppState {
  currentSessionId: string | null;
  sessions: ChatSession[];
  messages: Record<string, ChatMessage[]>;
  isLoading: boolean;
  error: string | null;
  // userId 现在从认证状态获取，不再存储在AppState中
  uploadStatus?: {
    isUploading: boolean;
    message: string;
    type: 'info' | 'success' | 'error';
  };
}

/**
 * UI 状态接口
 */
export interface UIState {
  sidebarOpen: boolean;
  currentView: 'chat' | 'settings';
  theme: 'light' | 'dark';
}
