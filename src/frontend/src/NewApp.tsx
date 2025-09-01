/**
 * 现代化主应用组件
 * 整合侧边栏和聊天面板，提供完整的现代化聊天界面
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from './hooks/useChat';
import { useResponsive } from './hooks/useResponsive';
import { NewSidebar } from './components/sidebar/NewSidebar';
import { NewMessageList } from './components/chat/NewMessageList';
import { NewChatInput } from './components/chat/NewChatInput';
import { HtmlViewer } from './components/viewer/HtmlViewer';
import { ThemeProvider } from './contexts/ThemeContext';
import { cn } from './utils/cn';

/**
 * 用户 ID（在实际应用中应该从认证系统获取）
 */
const USER_ID = 'user_1';

/**
 * 错误提示组件
 */
function ErrorToast({ error, onClose }: { error: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.95 }}
      className="fixed top-4 right-4 z-50 max-w-md"
    >
      <div className="bg-destructive text-destructive-foreground px-6 py-4 rounded-xl shadow-lg border">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <div className="font-medium text-sm">连接错误</div>
            <div className="text-sm mt-1 opacity-90">{error}</div>
          </div>
          <button
            onClick={onClose}
            className="text-destructive-foreground/60 hover:text-destructive-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * 现代化主应用组件内容
 */
function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [errorDismissed, setErrorDismissed] = useState(false);
  const [splitViewOpen, setSplitViewOpen] = useState(false);
  const [htmlViewerData, setHtmlViewerData] = useState<{
    htmlPath: string;
    title: string;
  } | null>(null);
  const [highlightedToolId, setHighlightedToolId] = useState<string | null>(null);
  const { isMobile, isDesktop } = useResponsive();
  
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
    // 像 Claude 一样，点击历史记录后自动隐藏侧边栏
    setSidebarOpen(false);
    await switchSession(sessionId);
  };

  /**
   * 处理新建会话
   */
  const handleNewSession = () => {
    // 像 Claude 一样，新建会话后也自动隐藏侧边栏
    setSidebarOpen(false);
    createNewSession();
  };

  /**
   * 处理发送消息
   */
  const handleSendMessage = async (message: string, files?: FileList) => {
    await sendMessage(message, files);
  };

  /**
   * 处理错误关闭
   */
  const handleErrorDismiss = () => {
    setErrorDismissed(true);
  };

  /**
   * 处理 HTML 查看
   */
  const handleViewHtml = (htmlPath: string, title?: string) => {
    setHtmlViewerData({
      htmlPath,
      title: title || 'HTML 预览'
    });
    setSplitViewOpen(true);
    
    // 高亮相关的工具调用（这里需要根据实际情况设置）
    // 由于无法直接知道是哪个工具调用触发的，我们可以通过其他方式来识别
    setHighlightedToolId(null); // 暂时设为 null，后续可以优化
  };

  /**
   * 关闭 HTML 查看器
   */
  const handleCloseHtmlViewer = () => {
    setSplitViewOpen(false);
    setHtmlViewerData(null);
    setHighlightedToolId(null);
  };

  // 响应式侧边栏控制 - 只在初始化时设置，之后由用户控制
  React.useEffect(() => {
    if (isDesktop) {
      setSidebarOpen(true);
    } else {
      setSidebarOpen(false);
    }
  }, [isDesktop]);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* 侧边栏 */}
      <AnimatePresence mode="wait">
        <NewSidebar
          sessions={state.sessions}
          currentSessionId={state.currentSessionId}
          onSessionSelect={handleSessionSelect}
          onNewSession={handleNewSession}
          isOpen={sidebarOpen}
          onToggle={toggleSidebar}
          isLoading={state.isLoading && !state.currentSessionId}
        />
      </AnimatePresence>

      {/* 主内容区域 */}
      <div className="flex-1 flex min-w-0 h-screen">
        {/* 聊天区域 */}
        <motion.div
          layout
          className={cn(
            'flex flex-col min-w-0 h-screen transition-all duration-300',
            splitViewOpen ? 'flex-1' : 'w-full'
          )}
        >
        {/* 会话标题栏 */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b bg-background/80 backdrop-blur-sm"
        >
          <div className="flex items-center gap-4">
            {/* 侧边栏切换按钮 */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleSidebar}
              className="p-2 hover:bg-accent rounded-lg transition-colors group"
              title={sidebarOpen ? "隐藏侧边栏" : "显示侧边栏"}
            >
              <svg 
                className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </motion.button>
            
            {/* 会话图标 */}
            <div className="p-2 bg-primary/10 rounded-lg">
              <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            
            {/* 会话信息 */}
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">
                {state.currentSessionId ? (
                  // 查找当前会话的标题
                  state.sessions.find(s => s.id === state.currentSessionId)?.title || '新对话'
                ) : '新对话'}
              </h2>
              
              {currentMessages.length > 0 && (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{currentMessages.length} 条消息</span>
                  </div>
                  <span>·</span>
                  <span>刚刚活跃</span>
                </div>
              )}
            </div>
          </div>
          
          {/* 状态指示器 */}
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 bg-emerald-500 rounded-full"
            />
            <span className="text-xs text-emerald-600 dark:text-emerald-400">
              AI 助手在线
            </span>
          </div>
        </motion.div>

        {/* 消息列表或欢迎界面 */}
        <div className="flex-1 overflow-hidden">
          {currentMessages.length > 0 ? (
            <NewMessageList 
              messages={currentMessages} 
              isLoading={state.isLoading}
              className="h-full"
              onViewHtml={handleViewHtml}
              highlightedToolId={highlightedToolId || undefined}
            />
          ) : (
            <div className="h-full overflow-y-auto">
              <div className="h-full flex items-center justify-center p-8">
                <div className="max-w-4xl mx-auto text-center space-y-8">
                  {/* 主标题区域 */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="space-y-6"
                  >
                    {/* Logo 图标 */}
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                      className="relative mx-auto w-20 h-20"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80 rounded-2xl rotate-3 opacity-20" />
                      <div className="relative bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center w-full h-full shadow-lg">
                        <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                    </motion.div>

                    {/* 标题 */}
                    <div className="space-y-3">
                      <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent"
                      >
                        你好！我是 MatterAI
                      </motion.h1>
                      
                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                        className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
                      >
                        我是您的智能旅游规划助手，可以帮您规划行程、查询景点、获取天气信息等。
                        让我们开始一段美妙的旅程吧！
                      </motion.p>
                    </div>
                  </motion.div>

                  {/* 示例问题 */}
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                    className="space-y-6"
                  >
                    <h2 className="text-xl font-semibold text-foreground">
                      您可以尝试以下问题
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { title: "规划旅游行程", desc: "帮我规划一次3天2夜的北京旅游行程" },
                        { title: "查询天气信息", desc: "查询上海未来一周的天气预报" },
                        { title: "推荐热门景点", desc: "推荐杭州最值得游览的热门景点" },
                        { title: "旅行建议咨询", desc: "为初次出国旅行提供实用建议" },
                        { title: "交通路线查询", desc: "查询从北京到上海的最佳交通方式" },
                        { title: "美食推荐", desc: "推荐成都必吃的特色美食" }
                      ].map((example, index) => (
                        <motion.div
                          key={example.title}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
                          whileHover={{ scale: 1.02, y: -4 }}
                          onClick={() => handleSendMessage(example.desc)}
                          className="p-6 bg-card border border-border rounded-xl cursor-pointer transition-all duration-200 hover:border-primary/30 hover:bg-card/80 shadow-sm hover:shadow-md"
                        >
                          <h3 className="font-medium text-sm text-foreground mb-2">
                            {example.title}
                          </h3>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {example.desc}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 固定在底部的输入框 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex-shrink-0 border-t bg-background"
        >
          <NewChatInput
            onSendMessage={handleSendMessage}
            disabled={state.isLoading || isConnected}
            placeholder={
              state.isLoading || isConnected
                ? '正在处理中，请稍候...' 
                : '向 MatterAI 发送消息...'
            }
          />
        </motion.div>
        </motion.div>

        {/* HTML 查看器 - 分屏右侧 */}
        <AnimatePresence>
          {splitViewOpen && htmlViewerData && (
            <div className="w-1/2 border-l">
              <HtmlViewer
                htmlPath={htmlViewerData.htmlPath}
                title={htmlViewerData.title}
                onClose={handleCloseHtmlViewer}
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* 错误提示 */}
      <AnimatePresence>
        {state.error && !errorDismissed && (
          <ErrorToast error={state.error} onClose={handleErrorDismiss} />
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * 现代化主应用组件
 */
function NewApp() {
  return (
    <ThemeProvider defaultTheme="light">
      <AppContent />
    </ThemeProvider>
  );
}

export default NewApp;
