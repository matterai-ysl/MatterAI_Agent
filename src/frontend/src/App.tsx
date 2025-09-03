/**
 * 主应用组件
 * 整合侧边栏和聊天面板，提供完整的聊天界面
 */

import React, { useState } from 'react';
import { useChat } from './hooks/useChat';
import { Sidebar } from './components/sidebar/Sidebar';
import { ChatPanel } from './components/chat/ChatPanel';
import { cn } from './utils/cn';

/**
 * 用户 ID（在实际应用中应该从认证系统获取）
 */
const USER_ID = 'user_1';

/**
 * 主应用组件
 */
function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // 使用聊天 Hook
  const {
    state,
    currentMessages,
    isConnected,
    sendMessage,
    switchSession,
    createNewSession,
  } = useChat(USER_ID);

  /**
   * 切换侧边栏
   */
  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  /**
   * 处理会话选择
   */
  const handleSessionSelect = async (sessionId: string | null) => {
    setSidebarOpen(false); // 移动端自动关闭侧边栏
    await switchSession(sessionId);
  };

  /**
   * 处理新建会话
   */
  const handleNewSession = () => {
    setSidebarOpen(false); // 移动端自动关闭侧边栏
    createNewSession();
  };

  /**
   * 处理发送消息
   */
  const handleSendMessage = async (message: string, files?: FileList) => {
    await sendMessage(message, files);
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* 侧边栏 */}
      <Sidebar
        sessions={state.sessions}
        currentSessionId={state.currentSessionId}
        onSessionSelect={handleSessionSelect}
        onNewSession={handleNewSession}
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
        isLoading={state.isLoading && !state.currentSessionId}
      />

      {/* 主内容区域 */}
      <div className={cn(
        'flex-1 flex flex-col',
        'lg:ml-0', // 大屏幕时不需要左边距（侧边栏是 relative 定位）
        sidebarOpen && 'lg:ml-80' // 当侧边栏打开时，为大屏幕添加左边距
      )}>
        {/* 聊天面板 */}
        <ChatPanel
          messages={currentMessages}
          onSendMessage={handleSendMessage}
          isLoading={state.isLoading}
          isConnected={isConnected}
          currentSessionId={state.currentSessionId}
          className="flex-1"
          uploadStatus={state.uploadStatus}
        />

        {/* 错误提示 */}
        {state.error && (
          <div className="absolute top-4 right-4 z-50">
            <div className="bg-destructive text-destructive-foreground px-4 py-2 rounded-lg shadow-lg max-w-md">
              <div className="font-medium text-sm">连接错误</div>
              <div className="text-sm mt-1">{state.error}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
