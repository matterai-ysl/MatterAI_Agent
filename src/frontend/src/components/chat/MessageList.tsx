/**
 * 消息列表组件
 * 显示聊天消息，支持流式更新
 */

import React, { useEffect, useRef } from 'react';
import { User, Bot, File, Image, Download } from 'lucide-react';
import { ChatMessage, MessageContent } from '../../types/chat';
import { formatDateTime, getFileIconType } from '../../utils/format';
import { cn } from '../../utils/cn';
import { ScrollArea } from '../ui/ScrollArea';
import { Button } from '../ui/Button';
import { ToolDisplay } from './ToolDisplay';

/**
 * 消息内容渲染组件
 */
function MessageContentRenderer({ content }: { content: MessageContent }) {
  switch (content.type) {
    case 'text':
      return (
        <div className="prose prose-sm max-w-none">
          <div className="whitespace-pre-wrap break-words">
            {content.text}
          </div>
        </div>
      );

    case 'image':
      return (
        <div className="space-y-2">
          {content.text && (
            <div className="whitespace-pre-wrap break-words text-sm">
              {content.text}
            </div>
          )}
          <div className="border rounded-lg overflow-hidden">
            <img
              src={content.fileUrl}
              alt={content.fileName || '图片'}
              className="max-w-full h-auto"
              loading="lazy"
            />
            {content.fileName && (
              <div className="p-2 bg-muted/50 text-xs text-muted-foreground">
                {content.fileName}
              </div>
            )}
          </div>
        </div>
      );

    case 'file':
      const iconType = getFileIconType(content.fileName || '');
      const FileIconComponent = iconType === 'image' ? Image : File;

      return (
        <div className="space-y-2">
          {content.text && (
            <div className="whitespace-pre-wrap break-words text-sm">
              {content.text}
            </div>
          )}
          <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
            <FileIconComponent className="h-8 w-8 text-blue-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">
                {content.fileName}
              </div>
              {content.fileSize && (
                <div className="text-xs text-muted-foreground">
                  {(content.fileSize / 1024 / 1024).toFixed(2)} MB
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="h-8 w-8"
            >
              <a
                href={content.fileUrl}
                download={content.fileName}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      );

    default:
      return null;
  }
}

/**
 * 单条消息组件
 */
function MessageItem({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  return (
    <div className={cn(
      'flex gap-4 p-4',
      isUser && 'flex-row-reverse'
    )}>
      {/* 头像 */}
      <div className={cn(
        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
        isUser ? 'bg-primary text-primary-foreground' : 'bg-secondary'
      )}>
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      {/* 消息内容 */}
      <div className={cn(
        'flex-1 space-y-3',
        isUser && 'flex flex-col items-end'
      )}>
        {/* 消息气泡 */}
        <div className={cn(
          'max-w-[80%] rounded-lg p-4',
          isUser 
            ? 'bg-primary text-primary-foreground ml-auto' 
            : 'bg-muted'
        )}>
          {/* 渲染消息内容 */}
          <div className="space-y-3">
            {message.content.map((content, index) => (
              <MessageContentRenderer key={index} content={content} />
            ))}
          </div>

          {/* 流式输出指示器 */}
          {message.isStreaming && isAssistant && (
            <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>正在回复...</span>
            </div>
          )}
        </div>

        {/* 工具调用展示 */}
        {isAssistant && (message.toolCalls || message.toolResults) && (
          <div className="max-w-[80%]">
            <ToolDisplay
              toolCalls={message.toolCalls}
              toolResults={message.toolResults}
            />
          </div>
        )}

        {/* 时间戳 */}
        <div className={cn(
          'text-xs text-muted-foreground',
          isUser && 'text-right'
        )}>
          {formatDateTime(message.timestamp)}
        </div>

        {/* 错误信息 */}
        {message.error && (
          <div className="max-w-[80%] p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="text-destructive text-sm">
              {message.error}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 消息列表组件属性接口
 */
interface MessageListProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  className?: string;
}

/**
 * 空状态组件
 */
function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md mx-auto px-4">
        <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
          <Bot className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">开始新对话</h3>
          <p className="text-muted-foreground text-sm">
            我是 MatterAI 旅游规划助手，可以帮您规划行程、查询景点、获取天气信息等。
          </p>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>您可以尝试以下问题：</p>
          <ul className="space-y-1 text-left">
            <li>• "帮我规划北京三日游"</li>
            <li>• "查询上海的天气情况"</li>
            <li>• "推荐杭州的热门景点"</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * 消息列表组件
 */
export function MessageList({ 
  messages, 
  isLoading = false, 
  className 
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0 && !isLoading) {
    return <EmptyState />;
  }

  return (
    <ScrollArea className={cn('flex-1', className)}>
      <div ref={scrollRef} className="min-h-full">
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
        
        {/* 加载指示器 */}
        {isLoading && messages.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>加载中...</span>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
