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

/**
 * API 基础配置
 */
const API_BASE_URL = 'http://localhost:9000';

/**
 * HTTP 请求工具类
 */
class HttpClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl || 'http://localhost:9000';
  }

  /**
   * 发送 GET 请求
   */
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    // 确保 baseUrl 不为空且格式正确
    const baseUrl = this.baseUrl || 'http://localhost:9000';
    const url = new URL(endpoint, baseUrl);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
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
    const baseUrl = this.baseUrl || 'http://localhost:9000';
    const url = new URL(endpoint, baseUrl);
    
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 上传文件
   */
  async uploadFiles(files: FileList): Promise<FileUploadResponse> {
    const baseUrl = this.baseUrl || 'http://localhost:9000';
    const url = new URL('/upload', baseUrl);
    const formData = new FormData();
    
    Array.from(files).forEach((file) => {
      formData.append('files', file);
    });

    const response = await fetch(url.toString(), {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed! status: ${response.status}`);
    }

    return response.json();
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
   * 获取用户会话列表
   */
  async getSessions(userId: string, appName: string = 'default'): Promise<SessionListResponse> {
    return this.httpClient.get('/sessions', { user_id: userId, app_name: appName });
  }

  /**
   * 获取会话历史记录
   */
  async getHistory(userId: string, sessionId: string, appName: string = 'default'): Promise<HistoryResponse> {
    return this.httpClient.get('/history', { 
      user_id: userId, 
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
      const baseUrl = API_BASE_URL || 'http://localhost:9000';
      const url = new URL('/chat/stream', baseUrl).toString();
      console.log('📡 请求URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
  async uploadFiles(files: FileList): Promise<FileUploadResponse> {
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
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

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
