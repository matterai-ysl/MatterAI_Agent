/**
 * 消息列表组件
 * 显示聊天消息，支持流式更新
 */

import React, { useEffect, useRef } from 'react';
import { User, Bot, File, Image, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
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
        <div className="prose prose-sm max-w-none dark:prose-invert markdown-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              // 自定义组件样式
              h1: ({ children }) => (
                <h1 className="text-xl font-bold mb-3 mt-4 text-foreground border-b pb-2">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-lg font-semibold mb-2 mt-3 text-foreground">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-base font-medium mb-2 mt-2 text-foreground">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="mb-2 last:mb-0 text-foreground leading-relaxed">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc pl-6 mb-2 space-y-1">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-6 mb-2 space-y-1">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="text-foreground">
                  {children}
                </li>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-foreground">
                  {children}
                </strong>
              ),
              em: ({ children }) => (
                <em className="italic text-foreground">
                  {children}
                </em>
              ),
              code: ({ children, className, ...props }) => {
                const isBlock = className?.includes('language-');
                if (isBlock) {
                  return (
                    <code className={cn(
                      "block bg-muted p-4 rounded-lg overflow-x-auto text-sm",
                      className
                    )} {...props}>
                      {children}
                    </code>
                  );
                }
                return (
                  <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => (
                <pre className="bg-muted border rounded-lg p-4 overflow-x-auto mb-4">
                  {children}
                </pre>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground mb-4">
                  {children}
                </blockquote>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto mb-4">
                  <table className="min-w-full border border-border rounded-lg">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-muted">
                  {children}
                </thead>
              ),
              th: ({ children }) => (
                <th className="border border-border px-4 py-2 text-left font-semibold">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-border px-4 py-2">
                  {children}
                </td>
              ),
              a: ({ href, children }) => (
                <a 
                  href={href} 
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
            }}
          >
            {content.text || ''}
          </ReactMarkdown>
        </div>
      );

    case 'image':
      return (
        <div className="space-y-3">
          {content.text && (
            <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {content.text}
            </div>
          )}
          <div className="border rounded-xl overflow-hidden bg-background shadow-sm">
            <img
              src={content.fileUrl}
              alt={content.fileName || '图片'}
              className="max-w-full h-auto max-h-96 object-cover"
              loading="lazy"
            />
            {content.fileName && (
              <div className="p-3 bg-muted/50 text-xs text-muted-foreground border-t">
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
        <div className="space-y-3">
          {content.text && (
            <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {content.text}
            </div>
          )}
          <div className="flex items-center gap-4 p-4 border rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileIconComponent className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
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
              className="h-8 w-8 hover:bg-background"
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
function MessageItem({ message, isLast }: { message: ChatMessage; isLast?: boolean }) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  return (
    <div className={cn(
      'group flex gap-4 px-6 py-6',
      !isLast && 'border-b border-border/20',
      isUser && 'bg-muted/30',
      'hover:bg-muted/50 transition-colors'
    )}>
      {/* 头像 */}
      <div className={cn(
        'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center shadow-sm',
        isUser 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-gradient-to-br from-primary/80 to-primary text-primary-foreground'
      )}>
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      {/* 消息内容 */}
      <div className="flex-1 space-y-3 min-w-0">
        {/* 角色标识 */}
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {isUser ? '你' : 'MINDS'}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDateTime(message.timestamp)}
          </span>
        </div>

        {/* 消息内容 */}
        <div className="space-y-3">
          {/* 渲染消息内容 */}
          <div className="space-y-3">
            {message.content.map((content, index) => (
              <MessageContentRenderer key={index} content={content} />
            ))}
          </div>

          {/* 流式输出指示器 */}
          {message.isStreaming && isAssistant && (
            <div className="flex items-center gap-2 mt-3 text-muted-foreground">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-sm">AI 正在输入...</span>
            </div>
          )}
        </div>

        {/* 工具调用展示 */}
        {isAssistant && (message.toolCalls || message.toolResults) && (
          <div>
            <ToolDisplay
              toolCalls={message.toolCalls}
              toolResults={message.toolResults}
              isStreaming={message.isStreaming}
            />
          </div>
        )}

        {/* 错误信息 */}
        {message.error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="text-destructive text-sm font-medium">
              ⚠️ 发生错误
            </div>
            <div className="text-destructive text-sm mt-1">
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
        {messages.map((message, index) => (
          <MessageItem 
            key={message.id} 
            message={message} 
            isLast={index === messages.length - 1}
          />
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
