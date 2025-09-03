/**
 * 现代化消息列表组件
 * 显示聊天消息，支持流式更新和现代化设计
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Bot, File, Image, Download, Copy, RotateCcw, ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { ChatMessage, MessageContent } from '../../types/chat';
import { formatDateTime, getFileIconType } from '../../utils/format';
import { cn } from '../../utils/cn';
// import { ScrollArea } from '../ui/ScrollArea'; // 不再使用，改为原生滚动
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
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="border rounded-xl overflow-hidden bg-background shadow-sm"
          >
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
          </motion.div>
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
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 p-4 border rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
          >
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
          </motion.div>
        </div>
      );

    default:
      return null;
  }
}

/**
 * 消息操作按钮
 */
function MessageActions({ 
  message, 
  onCopy, 
  onRegenerate,
  onRating,
  copied = false
}: { 
  message: ChatMessage;
  onCopy?: () => void;
  onRegenerate?: () => void;
  onRating?: (rating: 'up' | 'down') => void;
  copied?: boolean;
}) {
  const isAssistant = message.role === 'assistant';

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={onCopy}
        className="h-7 px-2 text-xs"
      >
        {copied ? (
          <>
            <Check className="h-3 w-3 mr-1 text-green-600" />
            已复制
          </>
        ) : (
          <>
            <Copy className="h-3 w-3 mr-1" />
            复制
          </>
        )}
      </Button>

      {isAssistant && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRegenerate}
            className="h-7 px-2 text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            重新生成
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRating?.('up')}
            className="h-7 w-7 p-0"
          >
            <ThumbsUp className="h-3 w-3" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRating?.('down')}
            className="h-7 w-7 p-0"
          >
            <ThumbsDown className="h-3 w-3" />
          </Button>
        </>
      )}
    </motion.div>
  );
}

/**
 * 流式输出指示器
 */
function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-2 mt-3 text-muted-foreground"
    >
      <div className="flex space-x-1">
        <motion.div
          className="w-2 h-2 bg-current rounded-full"
          animate={{ scale: [1, 1.4, 1] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
        />
        <motion.div
          className="w-2 h-2 bg-current rounded-full"
          animate={{ scale: [1, 1.4, 1] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
        />
        <motion.div
          className="w-2 h-2 bg-current rounded-full"
          animate={{ scale: [1, 1.4, 1] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
        />
      </div>
      <span className="text-sm">AI 正在输入...</span>
    </motion.div>
  );
}

/**
 * 单条消息组件
 */
const MessageItem = React.memo(function MessageItem({ 
  message, 
  isLast,
  onViewHtml,
  highlightedToolId,
  botName = 'MatterAI'
}: { 
  message: ChatMessage;
  isLast?: boolean;
  onViewHtml?: (htmlPath: string, title?: string) => void;
  highlightedToolId?: string;
  botName?: string;
}) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textContent = message.content
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('\n');
    navigator.clipboard.writeText(textContent);
    
    // 显示复制成功状态
    setCopied(true);
    // 2秒后恢复原状态
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = () => {
    // TODO: 实现重新生成功能
    console.log('Regenerate message:', message.id);
  };

  const handleRating = (rating: 'up' | 'down') => {
    // TODO: 实现评分功能
    console.log('Rate message:', message.id, rating);
  };

  return (
    <motion.div
      layout={!message.isStreaming} // 流式输出时禁用layout动画
      initial={!message.isStreaming && { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={message.isStreaming ? { duration: 0 } : { duration: 0.3 }}
      className={cn(
        'group flex gap-4 px-6 py-4',
        !isLast && 'border-b border-border/20',
        isUser && 'bg-muted/30',
        'hover:bg-muted/50 transition-colors'
      )}
    >
      {/* 头像 */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center shadow-sm',
          isUser 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-gradient-to-br from-primary/80 to-primary text-primary-foreground'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </motion.div>

      {/* 消息内容 */}
      <div className="flex-1 space-y-3 min-w-0">
        {/* 角色标识 */}
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {isUser ? '你' : botName}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDateTime(message.timestamp)}
          </span>
        </div>

        {/* 消息气泡 */}
        <motion.div
          initial={!message.isStreaming && { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={message.isStreaming ? { duration: 0 } : { delay: 0.2 }}
          className="space-y-3"
        >
          {/* 渲染消息内容 */}
          <div className="space-y-3">
            {message.content.map((content, index) => (
              <MessageContentRenderer key={index} content={content} />
            ))}
          </div>

          {/* 流式输出指示器 */}
          {message.isStreaming && isAssistant && isLast && (
            <TypingIndicator />
          )}
        </motion.div>

        {/* 工具调用展示 */}
        {isAssistant && (message.toolCalls || message.toolResults) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <ToolDisplay
              toolCalls={message.toolCalls}
              toolResults={message.toolResults}
              isStreaming={message.isStreaming}
              onViewHtml={onViewHtml}
              highlightedToolId={highlightedToolId}
            />
          </motion.div>
        )}

        {/* 消息操作 */}
        {!message.isStreaming && (
          <MessageActions
            message={message}
            onCopy={handleCopy}
            onRegenerate={handleRegenerate}
            onRating={handleRating}
            copied={copied}
          />
        )}

        {/* 错误信息 */}
        {message.error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg"
          >
            <div className="text-destructive text-sm font-medium">
              ⚠️ 发生错误
            </div>
            <div className="text-destructive text-sm mt-1">
              {message.error}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
});

/**
 * 消息列表组件属性接口
 */
interface MessageListProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  className?: string;
  onViewHtml?: (htmlPath: string, title?: string) => void;
  highlightedToolId?: string;
  botName?: string; // 添加bot名称参数
}

/**
 * 现代化消息列表组件
 */
export function NewMessageList({ 
  messages, 
  isLoading = false, 
  className,
  onViewHtml,
  highlightedToolId,
  botName = 'MatterAI'
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部 - 优化版本，减少抖动
  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current;
      
      // 检查是否已经在底部附近（避免用户手动滚动时被打断）
      const isNearBottom = scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight < 100;
      
      if (isNearBottom) {
        // 使用 requestAnimationFrame 优化滚动性能
        requestAnimationFrame(() => {
          if (scrollElement) {
            scrollElement.scrollTop = scrollElement.scrollHeight;
          }
        });
      }
    }
  }, [messages]);

  // 节流滚动已移除，不再使用

  // 监听流式消息的最后一条，实时滚动
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.isStreaming && scrollRef.current) {
        const scrollElement = scrollRef.current;
        const isNearBottom = scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight < 100;
        
        if (isNearBottom) {
          // 流式输出时使用更温和的滚动
          scrollElement.scrollTo({
            top: scrollElement.scrollHeight,
            behavior: 'smooth'
          });
        }
      }
    }
  }, [messages]);

  if (messages.length === 0 && !isLoading) {
    return null; // 显示欢迎界面
  }

  return (
    <div 
      ref={scrollRef}
      className={cn(
        'overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border hover:scrollbar-thumb-muted-foreground',
        'h-full', // 确保有高度约束
        className
      )}
    >
      <div className="min-h-full">
        {/* 使用条件渲染减少动画抖动 */}
        {messages.map((message, index) => (
                      <MessageItem 
              key={message.id} 
              message={message} 
              isLast={index === messages.length - 1}
              onViewHtml={onViewHtml}
              highlightedToolId={highlightedToolId}
              botName={botName}
            />
        ))}
        
        {/* 加载指示器 */}
        {isLoading && messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center py-12"
          >
            <div className="flex items-center gap-3 text-muted-foreground">
              <motion.div
                className="w-5 h-5 border-2 border-current border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <span className="text-sm">正在加载消息...</span>
            </div>
          </motion.div>
        )}

        {/* 底部间距 */}
        <div className="h-8" />
      </div>
    </div>
  );
}
