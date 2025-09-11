/**
 * 现代化侧边栏组件
 * 具有ChatGPT风格的设计和动画效果
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Settings, 
  Menu, 
  Plus, 
  MessageSquare, 
  Moon, 
  Sun, 
  Monitor,
  Search,
  Edit3,
  Trash2,
  Clock,
  User,
  LogOut,
  Key
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ChatSession } from '../../types/chat';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import { LanguageToggle } from '../ui/LanguageToggle';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

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
  appTitle?: string;
}

/**
 * 主题切换按钮
 */
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  const themes = [
    { value: 'light', icon: Sun, label: t('theme.light') },
    { value: 'dark', icon: Moon, label: t('theme.dark') },
    { value: 'system', icon: Monitor, label: t('theme.system') },
  ] as const;

  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
      {themes.map(({ value, icon: Icon, label }) => (
        <Button
          key={value}
          variant={theme === value ? "default" : "ghost"}
          size="sm"
          onClick={() => setTheme(value)}
          className={cn(
            "h-8 w-8 p-0",
            theme === value && "bg-primary text-primary-foreground shadow-sm"
          )}
          title={label}
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}
    </div>
  );
}

/**
 * 会话项组件
 */
function SessionItem({ 
  session, 
  isActive, 
  onSelect,
  onDelete,
  onRename 
}: { 
  session: ChatSession;
  isActive: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  onRename?: () => void;
}) {
  const { t } = useTranslation();
  const [showActions, setShowActions] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="group"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div
        onClick={onSelect}
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200",
          "hover:bg-sidebar-item-hover",
          isActive 
            ? "bg-primary text-primary-foreground shadow-sm" 
            : "text-foreground"
        )}
      >
        <MessageSquare className="h-4 w-4 flex-shrink-0" />
        
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate" title={session.title}>
            {session.title}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs opacity-70">
              {new Date(session.updatedAt).toLocaleString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
            <span className="text-xs opacity-70">
              {session.messageCount} {t('sidebar.messages')}
            </span>
          </div>
        </div>

        {/* 操作按钮 */}
        <AnimatePresence>
          {showActions && !isActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={onRename}
                className="h-6 w-6 p-0 opacity-70 hover:opacity-100"
              >
                <Edit3 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="h-6 w-6 p-0 opacity-70 hover:opacity-100 hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {isActive && (
          <div className="h-2 w-2 bg-primary-foreground rounded-full" />
        )}
      </div>
    </motion.div>
  );
}

/**
 * 搜索框组件
 */
function SearchBox({ 
  value, 
  onChange, 
  placeholder 
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || t('sidebar.searchChats')}
        className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}

/**
 * 用户菜单组件
 */
function UserMenu() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        className="w-full h-12 px-3 justify-start"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        <div className="flex items-center gap-3 w-full">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="font-medium text-sm truncate">
              {user.name || user.email}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {user.email}
            </div>
          </div>
        </div>
      </Button>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full left-0 right-0 mb-2 bg-popover border rounded-md shadow-lg p-1"
          >
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => {
                // TODO: Navigate to change password page
                window.location.href = '/auth?view=changePassword';
              }}
            >
              <Key className="h-4 w-4" />
              {t('auth.changePassword.button', '修改密码')}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-destructive hover:text-destructive"
              onClick={() => {
                logout();
                setIsMenuOpen(false);
              }}
            >
              <LogOut className="h-4 w-4" />
              {t('auth.logout', '退出登录')}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * 新建对话按钮
 */
function NewChatButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  const { t } = useTranslation();
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground",
          "shadow-sm hover:shadow-md transition-all duration-200",
          "font-medium text-sm flex items-center gap-3 justify-center"
        )}
      >
        <Plus className="h-4 w-4" />
        {t('sidebar.newChat')}
      </Button>
    </motion.div>
  );
}

/**
 * 现代化侧边栏组件
 */
export function NewSidebar({
  sessions,
  currentSessionId,
  onSessionSelect,
  onNewSession,
  isOpen,
  onToggle,
  isLoading = false,
  className,
  appTitle = "MatterAI",
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // 过滤并排序会话
  const filteredSessions = React.useMemo(() => {
    return sessions
      .filter(session =>
        session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.preview?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      // 按更新时间倒序排列（最新的在前），确保使用完整时间戳
      .sort((a, b) => {
        const timeA = typeof a.updatedAt === 'number' ? a.updatedAt : new Date(a.updatedAt).getTime();
        const timeB = typeof b.updatedAt === 'number' ? b.updatedAt : new Date(b.updatedAt).getTime();
        return timeB - timeA; // 倒序：最新的在前
      });
  }, [sessions, searchQuery]);

  // 按日期分组会话
  const groupedSessions = React.useMemo(() => {
    const groups: { [key: string]: ChatSession[] } = {};
    
    filteredSessions.forEach(session => {
      const date = new Date(session.updatedAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let groupKey = '';
      if (date.toDateString() === today.toDateString()) {
        groupKey = '今天';
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = '昨天';
      } else if (date.getTime() > today.getTime() - 7 * 24 * 60 * 60 * 1000) {
        groupKey = '最近 7 天';
      } else {
        groupKey = '更早';
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(session);
    });
    
    // 确保每个分组内的会话也按时间排序（最新在前）
    Object.keys(groups).forEach(groupKey => {
      groups[groupKey].sort((a, b) => {
        const timeA = typeof a.updatedAt === 'number' ? a.updatedAt : new Date(a.updatedAt).getTime();
        const timeB = typeof b.updatedAt === 'number' ? b.updatedAt : new Date(b.updatedAt).getTime();
        return timeB - timeA; // 倒序：最新的在前
      });
    });
    
    return groups;
  }, [filteredSessions]);

  const handleSessionDelete = (sessionId: string) => {
    // TODO: 实现删除功能
    console.log('Delete session:', sessionId);
  };

  const handleSessionRename = (sessionId: string) => {
    // TODO: 实现重命名功能
    console.log('Rename session:', sessionId);
  };

  return (
    <>
      {/* 遮罩层 - Claude 风格，桌面端也有遮罩 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 dark:bg-black/50 z-40"
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      {/* 侧边栏主体 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={cn(
              'fixed left-0 top-0 h-full w-80 bg-sidebar border-r z-50 shadow-xl',
              className
            )}
          >
        <div className="flex flex-col h-full">
          {/* 头部 */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <motion.h1 
                className="font-bold text-xl bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {appTitle}
              </motion.h1>
              
              {/* 关闭按钮 - Claude 风格 */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="h-8 w-8"
                title="隐藏侧边栏"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* 新建对话按钮 */}
            <NewChatButton onClick={onNewSession} disabled={isLoading} />
          </div>

          {/* 搜索框 */}
          <div className="p-4 border-b">
            <SearchBox
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="搜索对话..."
            />
          </div>

          {/* 会话列表 */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
            {isLoading && sessions.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">加载中...</span>
                </div>
              </div>
            ) : Object.keys(groupedSessions).length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm">
                  {searchQuery ? '没有找到匹配的对话' : '还没有对话历史'}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedSessions)
                  // 按分组顺序排列：今天 > 昨天 > 最近7天 > 更早
                  .sort(([a], [b]) => {
                    const order = ['今天', '昨天', '最近 7 天', '更早'];
                    return order.indexOf(a) - order.indexOf(b);
                  })
                  .map(([groupName, groupSessions]) => (
                  <motion.div
                    key={groupName}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-2 px-2 py-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {groupName}
                      </h3>
                    </div>
                    
                    <div className="space-y-1">
                      {groupSessions.map((session) => (
                        <SessionItem
                          key={session.id}
                          session={session}
                          isActive={currentSessionId === session.id}
                          onSelect={() => onSessionSelect(session.id)}
                          onDelete={() => handleSessionDelete(session.id)}
                          onRename={() => handleSessionRename(session.id)}
                        />
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* 底部设置区域 */}
          <div className="p-4 border-t space-y-3">
            {/* 用户信息 */}
            <UserMenu />
            
            {/* 设置选项 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LanguageToggle variant="text" size="sm" />
              </div>
              
              <ThemeToggle />
            </div>
          </div>
        </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 显示侧边栏按钮 - 当侧边栏隐藏时显示 */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed top-4 left-4 z-30"
          >
            <Button
              variant="default"
              size="icon"
              onClick={onToggle}
              className="h-10 w-10 shadow-lg"
              title="显示侧边栏"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
