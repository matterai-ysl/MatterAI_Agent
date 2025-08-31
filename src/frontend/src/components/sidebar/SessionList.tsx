/**
 * 会话列表组件
 * 显示用户的历史会话列表
 */

import React from 'react';
import { MessageSquare, Plus } from 'lucide-react';
import { ChatSession } from '../../types/chat';
import { formatRelativeTime, truncateText } from '../../utils/format';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import { ScrollArea } from '../ui/ScrollArea';

/**
 * 会话列表组件属性接口
 */
interface SessionListProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string | null) => void;
  onNewSession: () => void;
  isLoading?: boolean;
}

/**
 * 单个会话项组件
 */
function SessionItem({
  session,
  isActive,
  onClick,
}: {
  session: ChatSession;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-lg transition-colors group',
        'hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring',
        isActive && 'bg-muted'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm mb-1">
            {truncateText(session.title, 25)}
          </div>
          
          {session.preview && (
            <div className="text-xs text-muted-foreground mb-2 line-clamp-2">
              {truncateText(session.preview, 60)}
            </div>
          )}
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatRelativeTime(session.updatedAt)}</span>
            {session.messageCount > 0 && (
              <span>{session.messageCount} 条消息</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

/**
 * 会话列表组件
 */
export function SessionList({
  sessions,
  currentSessionId,
  onSessionSelect,
  onNewSession,
  isLoading = false,
}: SessionListProps) {
  return (
    <div className="flex flex-col h-full">
      {/* 新建会话按钮 */}
      <div className="p-4 border-b">
        <Button
          onClick={onNewSession}
          className="w-full justify-start gap-2"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          新建对话
        </Button>
      </div>

      {/* 会话列表 */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {isLoading ? (
            // 加载状态
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-muted/50 animate-pulse"
                >
                  <div className="h-4 bg-muted rounded mb-2" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : sessions.length === 0 ? (
            // 空状态
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">还没有历史对话</p>
              <p className="text-xs mt-1">点击"新建对话"开始聊天</p>
            </div>
          ) : (
            // 会话列表
            sessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === currentSessionId}
                onClick={() => onSessionSelect(session.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* 底部信息 */}
      <div className="p-4 border-t text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>共 {sessions.length} 个会话</span>
          <span>MatterAI Agent</span>
        </div>
      </div>
    </div>
  );
}
