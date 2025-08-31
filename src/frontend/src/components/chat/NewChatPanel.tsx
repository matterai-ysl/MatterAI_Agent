/**
 * 现代化聊天面板组件
 * 整合消息列表和输入框的主要聊天界面
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage } from '../../types/chat';
import { cn } from '../../utils/cn';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { WelcomeScreen } from './WelcomeScreen';
import { 
  Bot, 
  User, 
  Wifi, 
  WifiOff, 
  Clock,
  MoreHorizontal,
  Edit3
} from 'lucide-react';
import { Button } from '../ui/Button';

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
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2"
    >
      {isConnected ? (
        <>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 bg-emerald-500 rounded-full"
          />
          <span className="text-xs text-emerald-600 dark:text-emerald-400">
            AI 助手在线
          </span>
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            连接中...
          </span>
        </>
      )}
    </motion.div>
  );
}

/**
 * 会话标题栏
 */
function SessionHeader({ 
  sessionId, 
  messageCount,
  isConnected 
}: { 
  sessionId: string | null; 
  messageCount: number;
  isConnected: boolean;
}) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [title, setTitle] = React.useState(
    sessionId ? `会话 ${sessionId.slice(-8)}` : '新对话'
  );

  const handleTitleEdit = () => {
    setIsEditing(true);
  };

  const handleTitleSave = () => {
    setIsEditing(false);
    // TODO: 保存标题更改
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between px-6 py-4 border-b bg-background/80 backdrop-blur-sm"
    >
      <div className="flex items-center gap-4">
        {/* 会话图标 */}
        <div className="p-2 bg-primary/10 rounded-lg">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        
        {/* 会话信息 */}
        <div className="space-y-1">
          {isEditing ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
              className="text-lg font-semibold bg-transparent border-b border-primary focus:outline-none"
              autoFocus
            />
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">
                {title}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleTitleEdit}
                className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
              >
                <Edit3 className="h-3 w-3" />
              </Button>
            </div>
          )}
          
          {messageCount > 0 && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{messageCount} 条消息</span>
              </div>
              <span>·</span>
              <span>刚刚活跃</span>
            </div>
          )}
        </div>
      </div>
      
      {/* 状态和操作 */}
      <div className="flex items-center gap-4">
        <ConnectionStatus isConnected={isConnected} />
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}

/**
 * 处理中指示器
 */
function ProcessingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="px-6 py-3 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-800"
    >
      <div className="flex items-center gap-3 text-blue-700 dark:text-blue-300">
        <div className="flex space-x-1">
          <motion.div
            className="w-2 h-2 bg-current rounded-full"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
          />
          <motion.div
            className="w-2 h-2 bg-current rounded-full"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
          />
          <motion.div
            className="w-2 h-2 bg-current rounded-full"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
          />
        </div>
        <span className="text-sm font-medium">
          AI 正在思考...
        </span>
      </div>
    </motion.div>
  );
}

/**
 * 现代化聊天面板组件
 */
export function NewChatPanel({
  messages,
  onSendMessage,
  isLoading = false,
  isConnected = false,
  currentSessionId = null,
  className,
}: ChatPanelProps) {
  const isInputDisabled = isLoading || isConnected;
  const hasMessages = messages.length > 0;

  const handleExampleClick = (message: string) => {
    onSendMessage(message);
  };

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* 会话标题 */}
      <SessionHeader 
        sessionId={currentSessionId} 
        messageCount={messages.length}
        isConnected={!isConnected} // 注意：这里的逻辑可能需要调整
      />

      {/* 处理中指示器 */}
      <AnimatePresence>
        {isConnected && (
          <ProcessingIndicator />
        )}
      </AnimatePresence>

      {/* 主要内容区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {hasMessages ? (
          /* 消息列表 */
          <MessageList 
            messages={messages} 
            isLoading={isLoading}
            className="flex-1"
          />
        ) : (
          /* 欢迎界面 */
          <WelcomeScreen onExampleClick={handleExampleClick} />
        )}
      </div>

      {/* 输入框 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <ChatInput
          onSendMessage={onSendMessage}
          disabled={isInputDisabled}
          placeholder={
            isInputDisabled 
              ? '正在处理中，请稍候...' 
              : '向 MatterAI 发送消息...'
          }
        />
      </motion.div>
    </div>
  );
}
