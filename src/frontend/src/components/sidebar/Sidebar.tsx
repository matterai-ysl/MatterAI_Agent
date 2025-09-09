/**
 * 侧边栏组件
 * 包含会话列表和其他导航功能
 */

import React from 'react';
import { X, Settings, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ChatSession } from '../../types/chat';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import { LanguageToggle } from '../ui/LanguageToggle';
import { SessionList } from './SessionList';

/**
 * 侧边栏组件属性接口
 */
interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string | null) => void;
  onNewSession: () => void;
  isOpen: boolean;
  onToggle: () => void;
  isLoading?: boolean;
  className?: string;
  hideToggleButton?: boolean;
}

/**
 * 侧边栏组件
 */
export function Sidebar({
  sessions,
  currentSessionId,
  onSessionSelect,
  onNewSession,
  isOpen,
  onToggle,
  isLoading = false,
  className,
  hideToggleButton = false,
}: SidebarProps) {
  const { t } = useTranslation();
  return (
    <>
      {/* 移动端遮罩层 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* 侧边栏主体 */}
      <div
        className={cn(
          'fixed left-0 top-0 h-full w-80 bg-background border-r z-50 transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0 lg:relative' : '-translate-x-full',
          className
        )}
      >
        <div className="flex flex-col h-full">
          {/* 头部 */}
          <div className="flex items-center justify-between p-4 border-b">
            <h1 className="font-semibold text-lg">{t('sidebar.chatHistory')}</h1>
            <div className="flex items-center gap-1">
              {/* 语言切换按钮 */}
              <LanguageToggle size="sm" />
              
              {/* 设置按钮 */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title={t('sidebar.settings')}
              >
                <Settings className="h-4 w-4" />
              </Button>
              
              {/* 关闭按钮 */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="h-8 w-8"
                title={t('common.close')}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 会话列表 */}
          <SessionList
            sessions={sessions}
            currentSessionId={currentSessionId}
            onSessionSelect={onSessionSelect}
            onNewSession={onNewSession}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* 切换按钮 */}
      {!hideToggleButton && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn(
            'fixed top-4 left-4 z-30',
            isOpen && 'hidden'
          )}
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}
    </>
  );
}
