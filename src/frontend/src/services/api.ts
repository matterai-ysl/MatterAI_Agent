/**
 * API 服务层
 * 负责与后端进行通信，包括 HTTP 请求和 SSE 连接
 */

import {
  ChatRequest,
  SessionListResponse,
  HistoryResponse,
  FileUploadResponse,
  SSEEvent,
  ApiResponse
} from '../types/chat';

// SSO 相关类型
export interface SSOTokenVerifyRequest {
  sso_token: string;
}

export interface SSOTokenVerifyResponse {
  id: string;
  email: string;
  name: string;
  token: string;
  isAdmin: boolean;
  emailVerified: boolean;
}

/**
 * API 基础配置
 */
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://47.99.180.80/agent/api';
export const FILE_UPLOAD_URL = process.env.REACT_APP_FILE_UPLOAD_URL || 'http://47.99.180.80/file/upload';

// 调试信息
console.log('🔧 API配置调试信息:');
console.log('  REACT_APP_API_BASE_URL:', process.env.REACT_APP_API_BASE_URL);
console.log('  实际API_BASE_URL:', API_BASE_URL);
console.log('  FILE_UPLOAD_URL:', FILE_UPLOAD_URL);

/**
 * 确保基础URL以斜杠结尾，保证相对路径拼接不会截断最后一段
 */
function ensureTrailingSlash(url: string): string {
  return url.endsWith('/') ? url : url + '/';
}

/**
 * HTTP 请求工具类
 */
class HttpClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl || API_BASE_URL;
  }

  /**
   * 获取认证头
   */
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    const baseHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      return {
        ...baseHeaders,
        'Authorization': `Bearer ${token}`,
      };
    }

    return baseHeaders;
  }

  /**
   * 发送 GET 请求
   */
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    // 确保 baseUrl 不为空且格式正确
    const baseUrl = this.baseUrl || 'http://localhost:9000/agent/api';
    // 规范化端点，避免以 / 开头导致丢失 /agent/api 路径
    const normalizedEndpoint = endpoint.replace(/^\//, '');
    const url = new URL(normalizedEndpoint, ensureTrailingSlash(baseUrl));
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 发送 POST 请求
   */
  async post<T>(endpoint: string, data?: any): Promise<T> {
    const baseUrl = this.baseUrl || 'http://localhost:9000/agent/api';
    // 规范化端点，避免以 / 开头导致丢失 /agent/api 路径
    const normalizedEndpoint = endpoint.replace(/^\//, '');
    const url = new URL(normalizedEndpoint, ensureTrailingSlash(baseUrl));
    
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 上传文件到新的公网服务器
   */
  async uploadFiles(files: FileList): Promise<string[]> {
    const uploadUrl = FILE_UPLOAD_URL;
    const formData = new FormData();

    Array.from(files).forEach((file) => {
      formData.append('files', file);
    });

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed! status: ${response.status}`);
    }

    const result: FileUploadResponse = await response.json();

    // 根据响应格式提取 URL 列表
    if ('files' in result) {
      // 多文件上传响应
      return result.files.filter(file => file.success).map(file => file.url);
    } else {
      // 单文件上传响应
      return result.success ? [result.url] : [];
    }
  }
}

/**
 * SSE 客户端类
 */
export class SSEClient {
  private eventSource: EventSource | null = null;
  private url: string;

  constructor(endpoint: string, baseUrl: string = API_BASE_URL) {
    this.url = new URL(endpoint, baseUrl).toString();
  }

  /**
   * 开始 SSE 连接
   */
  connect(
    onMessage: (event: SSEEvent) => void,
    onError: (error: Error) => void,
    onComplete: () => void
  ): void {
    this.eventSource = new EventSource(this.url);

    this.eventSource.onmessage = (event) => {
      try {
        const data: SSEEvent = JSON.parse(event.data);
        
        if (data.type === 'done') {
          onComplete();
          this.close();
        } else if (data.type === 'error') {
          onError(new Error(data.error || 'Unknown error'));
          this.close();
        } else {
          onMessage(data);
        }
      } catch (err) {
        onError(new Error('Failed to parse SSE message'));
      }
    };

    this.eventSource.onerror = () => {
      onError(new Error('SSE connection error'));
      this.close();
    };
  }

  /**
   * 关闭 SSE 连接
   */
  close(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}

/**
 * 聊天 API 服务
 */
export class ChatApiService {
  private httpClient: HttpClient;

  constructor() {
    this.httpClient = new HttpClient();
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: string }> {
    return this.httpClient.get('/health');
  }

  /**
   * 获取用户会话列表（用户ID现在从JWT token获取）
   */
  async getSessions(appName: string = 'default'): Promise<SessionListResponse> {
    return this.httpClient.get('/sessions', { app_name: appName });
  }

  /**
   * 获取会话历史记录（用户ID现在从JWT token获取）
   */
  async getHistory(sessionId: string, appName: string = 'default'): Promise<HistoryResponse> {
    return this.httpClient.get('/history', { 
      session_id: sessionId,
      app_name: appName
    });
  }

  /**
   * 开始流式聊天
   */
  async startStreamingChat(
    request: ChatRequest,
    onMessage: (event: SSEEvent) => void,
    onError: (error: Error) => void,
    onComplete: () => void
  ): Promise<SSEClient> {
    console.log('🚀 开始流式聊天请求:', request);
    
    try {
      const baseUrl = API_BASE_URL || 'http://localhost:9000/agent/api';
      // 不以 / 开头，确保保留 /agent/api 前缀
      const url = new URL('chat/stream', ensureTrailingSlash(baseUrl)).toString();
      console.log('📡 请求URL:', url);
      
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(request),
      });

      console.log('📥 响应状态:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP 错误:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      // 读取 SSE 流
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      const sseClient = new SSEClient('');

      // 手动处理 SSE 流
      const processStream = async () => {
        let buffer = '';
        console.log('📡 开始处理SSE流...');
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log('✅ 流读取完成');
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            console.log('📨 收到数据块:', chunk);

            // 按行分割并处理
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // 保留不完整的行

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const jsonData = line.slice(6).trim();
                  if (jsonData) {
                    const data = JSON.parse(jsonData);
                    console.log('📦 解析SSE事件:', data);
                    
                    if (data.type === 'done') {
                      console.log('🏁 收到完成信号');
                      onComplete();
                      return;
                    } else if (data.type === 'error') {
                      console.error('❌ 收到错误:', data.error);
                      onError(new Error(data.error || 'Unknown error'));
                      return;
                    } else {
                      onMessage(data);
                    }
                  }
                } catch (err) {
                  console.warn('⚠️ 解析SSE消息失败:', line, err);
                }
              }
            }
          }
          
          // 处理剩余的 buffer
          if (buffer.trim()) {
            console.log('📦 处理剩余数据:', buffer);
          }
          
        } catch (error) {
          console.error('❌ 流处理错误:', error);
          onError(error instanceof Error ? error : new Error('Stream error'));
        } finally {
          reader.releaseLock();
          console.log('🔓 释放流读取器');
        }
      };

      // 立即开始处理流，不等待
      processStream().catch(error => {
        console.error('❌ 流处理异常:', error);
        onError(error instanceof Error ? error : new Error('Stream processing failed'));
      });
      
      return sseClient;
    } catch (error) {
      console.error('❌ 启动聊天失败:', error);
      onError(error instanceof Error ? error : new Error('Failed to start chat'));
      throw error;
    }
  }

  /**
   * 上传文件
   */
  async uploadFiles(files: FileList): Promise<string[]> {
    return this.httpClient.uploadFiles(files);
  }
}

/**
 * 导出单例实例
 */
export const chatApiService = new ChatApiService();

/**
 * 错误处理工具
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 认证相关 API 接口
 */
export interface AuthApiService {
  // 邮箱验证
  sendVerificationCode(request: { email: string; purpose: string }): Promise<any>;
  verifyCode(request: { email: string; code: string; purpose: string }): Promise<any>;
  
  // 用户注册和登录
  registerWithVerification(request: { 
    name?: string; 
    email: string; 
    password: string; 
    verification_code: string; 
  }): Promise<any>;
  resetPassword(request: { 
    email: string; 
    new_password: string; 
    verification_code: string; 
  }): Promise<any>;
  
  // 账户管理
  bindEmail(request: { new_email: string; verification_code: string }): Promise<any>;
  changePassword(request: { 
    email: string; 
    current_password: string; 
    new_password: string; 
  }): Promise<any>;
  getUserProfile(): Promise<any>;
}

/**
 * 认证 API 服务实现
 */
class AuthApiServiceImpl implements AuthApiService {
  private baseUrl: string = API_BASE_URL;

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token && !endpoint.includes('login') && !endpoint.includes('register')) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async sendVerificationCode(request: { email: string; purpose: string }): Promise<any> {
    return this.makeRequest('/auth/send-verification-code', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async verifyCode(request: { email: string; code: string; purpose: string }): Promise<any> {
    return this.makeRequest('/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async registerWithVerification(request: { 
    name?: string; 
    email: string; 
    password: string; 
    verification_code: string; 
  }): Promise<any> {
    return this.makeRequest('/auth/register-with-verification', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async resetPassword(request: { 
    email: string; 
    new_password: string; 
    verification_code: string; 
  }): Promise<any> {
    return this.makeRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async bindEmail(request: { new_email: string; verification_code: string }): Promise<any> {
    return this.makeRequest('/auth/bind-email', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async changePassword(request: { 
    email: string; 
    current_password: string; 
    new_password: string; 
  }): Promise<any> {
    return this.makeRequest('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getUserProfile(): Promise<any> {
    return this.makeRequest('/auth/me', {
      method: 'GET',
    });
  }

  // SSO 相关方法
  async verifySSOToken(ssoToken: string): Promise<SSOTokenVerifyResponse> {
    return this.makeRequest('/auth/sso/verify', {
      method: 'POST',
      body: JSON.stringify({ sso_token: ssoToken }),
    });
  }

  // 生成跳转到B网站的URL
  generateSSOUrl(targetSiteUrl: string, redirectPath: string = '/'): string {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('用户未登录，无法进行SSO跳转');
    }

    const ssoUrl = `${targetSiteUrl}/auth/sso?token=${encodeURIComponent(token)}&redirect_to=${encodeURIComponent(redirectPath)}`;
    return ssoUrl;
  }
}

/**
 * 导出认证 API 服务实例
 */
export const api = new AuthApiServiceImpl();

/**
 * API 响应包装器
 */
export const apiResponse = {
  success: <T>(data: T): ApiResponse<T> => ({
    success: true,
    data,
  }),
  
  error: (message: string, code?: string): ApiResponse => ({
    success: false,
    error: message,
  }),
};
