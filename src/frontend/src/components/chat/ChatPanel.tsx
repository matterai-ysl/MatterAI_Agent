/**
 * 聊天面板组件
 * 整合消息列表和输入框的主要聊天界面
 */

import React from 'react';
import { ChatMessage } from '../../types/chat';
import { cn } from '../../utils/cn';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

/**
 * 聊天面板组件属性接口
 */
interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string, files?: FileList) => void;
  isLoading?: boolean;
  isConnected?: boolean;
  currentSessionId?: string | null;
  className?: string;
}

/**
 * 连接状态指示器
 */
function ConnectionStatus({ isConnected }: { isConnected: boolean }) {
  if (!isConnected) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-b border-blue-200 text-blue-700 text-sm">
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
      <span>正在连接到智能体...</span>
    </div>
  );
}

/**
 * 会话标题栏
 */
function SessionHeader({ 
  sessionId, 
  messageCount 
}: { 
  sessionId: string | null; 
  messageCount: number; 
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b bg-background/50 backdrop-blur">
      <div>
        <h2 className="font-semibold text-lg">
          {sessionId ? `会话 ${sessionId.slice(-8)}` : '新对话'}
        </h2>
        {messageCount > 0 && (
          <p className="text-sm text-muted-foreground">
            {messageCount} 条消息
          </p>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 bg-green-500 rounded-full"></div>
        <span className="text-sm text-muted-foreground">在线</span>
      </div>
    </div>
  );
}

/**
 * 聊天面板组件
 */
export function ChatPanel({
  messages,
  onSendMessage,
  isLoading = false,
  isConnected = false,
  currentSessionId = null,
  className,
}: ChatPanelProps) {
  const isInputDisabled = isLoading || isConnected;

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* 会话标题 */}
      <SessionHeader 
        sessionId={currentSessionId} 
        messageCount={messages.length} 
      />

      {/* 连接状态 */}
      <ConnectionStatus isConnected={isConnected} />

      {/* 消息列表 */}
      <MessageList 
        messages={messages} 
        isLoading={isLoading}
        className="flex-1"
      />

      {/* 输入框 */}
      <ChatInput
        onSendMessage={onSendMessage}
        disabled={isInputDisabled}
        placeholder={
          isInputDisabled 
            ? '正在处理中，请稍候...' 
            : '向 MatterAI 发送消息...'
        }
      />
    </div>
  );
}
