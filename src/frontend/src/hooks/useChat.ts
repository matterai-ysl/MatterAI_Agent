/**
 * 聊天功能 Hook
 * 管理聊天状态、消息流式处理、会话管理等核心逻辑
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  ChatMessage, 
  ChatSession, 
  SSEEvent, 
  MessageContent,
  ToolCall,
  ToolResult,
  AppState 
} from '../types/chat';
import { chatApiService, SSEClient } from '../services/api';

/**
 * 聊天 Hook 返回值接口
 */
interface UseChatReturn {
  // 状态
  state: AppState;
  currentMessages: ChatMessage[];
  isConnected: boolean;
  
  // 操作方法
  sendMessage: (content: string, files?: FileList, selectedTools?: string[], customTools?: any[]) => Promise<void>;
  switchSession: (sessionId: string | null) => Promise<void>;
  createNewSession: () => void;
  loadSessions: () => Promise<void>;
  loadHistory: (sessionId: string) => Promise<void>;
  uploadFiles: (files: FileList) => Promise<string[]>;
  
  // 连接控制
  disconnect: () => void;
}

/**
 * 聊天功能主 Hook
 */
export function useChat(userId: string): UseChatReturn {
  // 核心状态
  const [state, setState] = useState<AppState>({
    currentSessionId: null,
    sessions: [],
    messages: {},
    isLoading: false,
    error: null,
    userId,
  });

  // SSE 连接管理
  const [isConnected, setIsConnected] = useState(false);
  const sseClientRef = useRef<SSEClient | null>(null);
  const currentMessageRef = useRef<ChatMessage | null>(null);

  /**
   * 更新状态的辅助函数
   */
  const updateState = useCallback((updater: (prev: AppState) => AppState) => {
    setState(updater);
  }, []);

  /**
   * 添加消息到指定会话
   */
  const addMessage = useCallback((sessionId: string, message: ChatMessage) => {
    console.log('📨 添加消息到会话:', { sessionId, messageId: message.id, messageRole: message.role });
    updateState(prev => {
      // 更新会话的 updatedAt 时间戳
      const updatedSessions = prev.sessions.map(session => 
        session.id === sessionId 
          ? { ...session, updatedAt: message.timestamp }
          : session
      );

      const newState = {
        ...prev,
        sessions: updatedSessions,
        messages: {
          ...prev.messages,
          [sessionId]: [...(prev.messages[sessionId] || []), message],
        },
      };
      console.log('📊 更新后的消息状态:', newState.messages);
      return newState;
    });
  }, [updateState]);

  /**
   * 更新最后一条消息
   */
  const updateLastMessage = useCallback((sessionId: string, updater: (prev: ChatMessage) => ChatMessage) => {
    console.log('🔄 更新最后一条消息:', { sessionId });
    updateState(prev => {
      const messages = prev.messages[sessionId] || [];
      console.log('📝 当前会话消息数量:', messages.length);
      
      if (messages.length === 0) {
        console.warn('⚠️ 没有消息可更新');
        return prev;
      }
      
      const updatedMessages = [...messages];
      const lastMessage = updatedMessages[updatedMessages.length - 1];
      console.log('📝 更新前的最后一条消息:', lastMessage);
      
      const newLastMessage = updater(lastMessage);
      updatedMessages[updatedMessages.length - 1] = newLastMessage;
      console.log('📝 更新后的最后一条消息:', newLastMessage);
      
      // 更新会话的 updatedAt 时间戳
      const updatedSessions = prev.sessions.map(session => 
        session.id === sessionId 
          ? { ...session, updatedAt: newLastMessage.timestamp }
          : session
      );
      
      const newState = {
        ...prev,
        sessions: updatedSessions,
        messages: {
          ...prev.messages,
          [sessionId]: updatedMessages,
        },
      };
      
      console.log('📊 更新后的全部消息:', newState.messages[sessionId]);
      return newState;
    });
  }, [updateState]);

  // 使用 ref 来跟踪当前的 sessionId，避免闭包问题
  const currentSessionIdRef = useRef<string | null>(null);

  /**
   * 处理 SSE 消息
   */
  const handleSSEMessage = useCallback((event: SSEEvent) => {
    console.log('📨 处理SSE消息:', event);
    
    // 特殊处理 meta 事件 - 可能需要更新 sessionId
    if (event.type === 'meta' && event.session_id) {
      console.log('📋 处理meta事件，更新sessionId:', event.session_id);
      const oldSessionId = currentSessionIdRef.current || state.currentSessionId;
      const newSessionId = event.session_id;
      
      currentSessionIdRef.current = newSessionId;
      
      // 如果sessionId发生变化，需要迁移消息
      if (oldSessionId && oldSessionId !== newSessionId) {
        console.log('🔄 迁移消息从', oldSessionId, '到', newSessionId);
        updateState(prev => {
          const oldMessages = prev.messages[oldSessionId] || [];
          const newMessages = { ...prev.messages };
          
          // 迁移消息并更新sessionId
          if (oldMessages.length > 0) {
            newMessages[newSessionId] = oldMessages.map(msg => ({
              ...msg,
              sessionId: newSessionId
            }));
            delete newMessages[oldSessionId];
          }
          
          return {
            ...prev,
            currentSessionId: newSessionId,
            messages: newMessages
          };
        });
      } else {
        updateState(prev => ({ ...prev, currentSessionId: newSessionId }));
      }
      
      // 更新当前消息的 sessionId
      if (currentMessageRef.current) {
        currentMessageRef.current.sessionId = newSessionId;
      }
      return; // meta 事件处理完成
    }
    
    // 获取当前的 sessionId（优先使用 ref 中的值）
    const sessionId = currentSessionIdRef.current || state.currentSessionId;
    
    // 对于其他事件，需要有有效的 sessionId 和当前消息
    if (!sessionId || !currentMessageRef.current) {
      console.warn('⚠️ 跳过SSE事件 - sessionId或currentMessage为空:', { 
        sessionId, 
        currentSessionIdFromRef: currentSessionIdRef.current,
        currentSessionIdFromState: state.currentSessionId,
        hasCurrentMessage: !!currentMessageRef.current 
      });
      return;
    }

    switch (event.type) {

      case 'delta':
        // 流式文本更新
        if (event.text) {
          console.log('📝 处理delta事件，添加文本:', event.text);
          updateLastMessage(sessionId, prev => {
            const updatedContent = prev.content.map(c => 
              c.type === 'text' 
                ? { ...c, text: (c.text || '') + event.text }
                : c
            );
            console.log('📝 更新后的消息内容:', updatedContent);
            return {
              ...prev,
              content: updatedContent,
              isStreaming: true,
            };
          });
        }
        break;

      case 'tool_call':
        // 工具调用
        if (event.name && event.args) {
          const toolCall: ToolCall = {
            id: `${Date.now()}-${Math.random()}`,
            name: event.name,
            args: event.args,
            timestamp: Date.now(),
          };

          updateLastMessage(sessionId, prev => ({
            ...prev,
            toolCalls: [...(prev.toolCalls || []), toolCall],
          }));
        }
        break;

      case 'tool_result':
        // 工具结果
        if (event.name && event.result !== undefined) {
          const toolResult: ToolResult = {
            id: `${Date.now()}-${Math.random()}`,
            name: event.name,
            result: event.result,
            timestamp: Date.now(),
          };

          updateLastMessage(sessionId, prev => ({
            ...prev,
            toolResults: [...(prev.toolResults || []), toolResult],
          }));
        }
        break;

      default:
        break;
    }
  }, [state.currentSessionId, updateLastMessage, updateState]);

  /**
   * 处理 SSE 错误
   */
  const handleSSEError = useCallback((error: Error) => {
    console.error('SSE Error:', error);
    updateState(prev => ({ ...prev, error: error.message, isLoading: false }));
    setIsConnected(false);
  }, [updateState]);

  /**
   * 处理 SSE 完成
   */
  const handleSSEComplete = useCallback(() => {
    console.log('🏁 SSE连接完成');
    const sessionId = currentSessionIdRef.current || state.currentSessionId;
    if (sessionId && currentMessageRef.current) {
      console.log('✅ 停止流式状态');
      updateLastMessage(sessionId, prev => ({
        ...prev,
        isStreaming: false,
      }));
    }
    
    setIsConnected(false);
    updateState(prev => ({ ...prev, isLoading: false }));
    currentMessageRef.current = null;
  }, [state.currentSessionId, updateLastMessage, updateState]);

  /**
   * 发送消息
   */
  const sendMessage = useCallback(async (content: string, files?: FileList, selectedTools?: string[], customTools?: any[]) => {
    console.log('🚀 sendMessage 被调用:', { content, hasFiles: !!files?.length });
    
    if (!content.trim() && !files?.length) {
      console.log('❌ 消息内容为空，取消发送');
      return;
    }

    console.log('📤 开始发送消息...');
    updateState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // 处理文件上传
      let fileUrls: string[] = [];
      if (files?.length) {
        fileUrls = await chatApiService.uploadFiles(files);
      }

      // 构建消息内容
      const messageContent: MessageContent[] = [];
      
      if (content.trim()) {
        messageContent.push({ type: 'text', text: content.trim() });
      }

      fileUrls.forEach((url, index) => {
        const file = files![index];
        messageContent.push({
          type: file.type.startsWith('image/') ? 'image' : 'file',
          fileUrl: url,
          fileName: file.name,
          fileSize: file.size,
        });
      });

      // 创建用户消息
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: messageContent,
        timestamp: Date.now(),
        sessionId: state.currentSessionId || '',
      };

      // 创建助手消息（用于流式更新）
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: [{ type: 'text', text: '' }],
        timestamp: Date.now(),
        sessionId: state.currentSessionId || '',
        isStreaming: true,
      };

      // 添加消息到当前会话
      const sessionId = state.currentSessionId || `session-${Date.now()}`;
      
      // 同步更新 ref 中的 sessionId
      currentSessionIdRef.current = sessionId;
      
      // 更新消息的 sessionId
      userMessage.sessionId = sessionId;
      assistantMessage.sessionId = sessionId;
      
      addMessage(sessionId, userMessage);
      addMessage(sessionId, assistantMessage);
      
      currentMessageRef.current = assistantMessage;

      // 转换自定义工具格式以匹配后端期望
      const convertedCustomTools = (customTools || []).map(tool => ({
        url: tool.mcpUrl,
        transport: tool.transportType,
      }));

      // 开始 SSE 连接
      console.log('🔌 准备建立SSE连接...');
      setIsConnected(true);
      const sseClient = await chatApiService.startStreamingChat(
        {
          user_id: userId,
          query: content,
          session_id: state.currentSessionId || undefined,
          selected_tools: selectedTools || [],
          custom_tools: convertedCustomTools,
        },
        handleSSEMessage,
        handleSSEError,
        handleSSEComplete
      );

      console.log('✅ SSE连接建立成功');
      sseClientRef.current = sseClient;

    } catch (error) {
      console.error('Send message error:', error);
      updateState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : '发送消息失败',
        isLoading: false 
      }));
      setIsConnected(false);
    }
  }, [
    state.currentSessionId, 
    userId, 
    addMessage, 
    updateState, 
    handleSSEMessage, 
    handleSSEError, 
    handleSSEComplete
  ]);

  /**
   * 切换会话
   */
  const switchSession = useCallback(async (sessionId: string | null) => {
    // 断开当前连接
    disconnect();

    // 同步更新 ref
    currentSessionIdRef.current = sessionId;
    
    updateState(prev => ({ 
      ...prev, 
      currentSessionId: sessionId, 
      isLoading: !!sessionId 
    }));

    // 加载会话历史
    if (sessionId) {
      await loadHistory(sessionId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 创建新会话
   */
  const createNewSession = useCallback(() => {
    disconnect();
    currentSessionIdRef.current = null;
    updateState(prev => ({ ...prev, currentSessionId: null }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 加载会话列表
   */
  const loadSessions = useCallback(async () => {
    try {
      const response = await chatApiService.getSessions(userId);
      
      // 转换为 ChatSession 格式，并为每个会话获取第一条用户消息作为标题
      const sessions: ChatSession[] = [];
      
      for (const id of response.sessions) {
        try {
          // 获取会话的第一条消息作为标题
          const historyResponse = await chatApiService.getHistory(userId, id);
          let title = `会话 ${id.slice(-8)}`; // 默认标题
          
          // 查找第一条用户消息
          const firstUserMessage = historyResponse.messages.find(msg => msg.role === 'user');
          if (firstUserMessage) {
            if (firstUserMessage.content && firstUserMessage.content.length > 0) {
              const firstTextContent = firstUserMessage.content.find((c: any) => c.type === 'text');
              if (firstTextContent && firstTextContent.text) {
                title = firstTextContent.text.length > 30 
                  ? firstTextContent.text.substring(0, 30) + '...'
                  : firstTextContent.text;
              }
            } else if (firstUserMessage.text) {
              // 兼容旧格式
              title = firstUserMessage.text.length > 30 
                ? firstUserMessage.text.substring(0, 30) + '...'
                : firstUserMessage.text;
            }
          }
          
          // 获取最后一条消息的时间戳
          let lastMessageTime = Date.now(); // 默认为当前时间
          if (historyResponse.messages.length > 0) {
            const lastMessage = historyResponse.messages[historyResponse.messages.length - 1];
            if (lastMessage.timestamp) {
              lastMessageTime = lastMessage.timestamp;
            }
          }

          sessions.push({
            id,
            title,
            createdAt: Date.now(), // 会话创建时间保持不变
            updatedAt: lastMessageTime, // 使用最后一条消息的时间
            messageCount: historyResponse.messages.length,
          });
        } catch (error) {
          console.warn(`获取会话 ${id} 标题失败:`, error);
          // 如果获取失败，使用默认标题
          sessions.push({
            id,
            title: `会话 ${id.slice(-8)}`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messageCount: 0,
          });
        }
      }

      updateState(prev => ({ ...prev, sessions }));
    } catch (error) {
      console.error('Load sessions error:', error);
      updateState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : '加载会话列表失败' 
      }));
    }
  }, [userId, updateState]);

  /**
   * 加载会话历史
   */
  const loadHistory = useCallback(async (sessionId: string) => {
    try {
      const response = await chatApiService.getHistory(userId, sessionId);
      console.log('📚 加载历史记录:', response);
      
      // 转换历史消息格式
      const messages: ChatMessage[] = response.messages.map((msg: any, index: number) => {
        const message: ChatMessage = {
          id: `${sessionId}-${index}`,
          role: msg.role || 'assistant',
          content: msg.content || [{ type: 'text', text: msg.text || '' }],
          timestamp: msg.timestamp || (Date.now() - (response.messages.length - index) * 1000),
          sessionId,
          toolCalls: msg.toolCalls || [],
          toolResults: msg.toolResults || [],
        };
        
        console.log('📝 转换历史消息:', message);
        return message;
      });

      updateState(prev => ({
        ...prev,
        messages: {
          ...prev.messages,
          [sessionId]: messages,
        },
        isLoading: false,
      }));

    } catch (error) {
      console.error('Load history error:', error);
      updateState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : '加载历史记录失败',
        isLoading: false 
      }));
    }
  }, [userId, updateState]);

  /**
   * 上传文件
   */
  const uploadFiles = useCallback(async (files: FileList): Promise<string[]> => {
    return chatApiService.uploadFiles(files);
  }, []);

  /**
   * 断开连接
   */
  const disconnect = useCallback(() => {
    if (sseClientRef.current) {
      sseClientRef.current.close();
      sseClientRef.current = null;
    }
    setIsConnected(false);
    currentMessageRef.current = null;
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // 初始化时加载会话列表
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const currentMessages = state.currentSessionId ? (state.messages[state.currentSessionId] || []) : [];
  console.log('🎯 useChat 返回状态:', { 
    currentSessionId: state.currentSessionId, 
    messagesCount: currentMessages.length,
    isLoading: state.isLoading,
    isConnected 
  });

  return {
    state,
    currentMessages,
    isConnected,
    
    sendMessage,
    switchSession,
    createNewSession,
    loadSessions,
    loadHistory,
    uploadFiles,
    disconnect,
  };
}
