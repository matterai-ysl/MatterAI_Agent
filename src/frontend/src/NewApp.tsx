/**
 * 现代化主应用组件
 * 整合侧边栏和聊天面板，提供完整的现代化聊天界面
 */

import React, { useState, useEffect } from 'react';
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
  
  // 设置动态标题
  useEffect(() => {
    document.title = 'MatterAI Agent - 您可靠的科研伙伴';
  }, []);
  const [splitViewOpen, setSplitViewOpen] = useState(false);
  const [htmlViewerData, setHtmlViewerData] = useState<{
    htmlPath: string;
    title: string;
  } | null>(null);
  const [highlightedToolId, setHighlightedToolId] = useState<string | null>(null);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [customTools, setCustomTools] = useState<any[]>([]);
  const { isDesktop } = useResponsive();
  
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
  const handleSendMessage = async (message: string, files?: FileList, tools?: string[], customToolsData?: any[]) => {
    await sendMessage(message, files, tools, customToolsData);
    console.log('Selected tools:', tools);
    console.log('Custom tools:', customToolsData);
  };

  /**
   * 处理工具选择变化
   */
  const handleToolsChange = (tools: string[], customToolsData: any[]) => {
    setSelectedTools(tools);
    setCustomTools(customToolsData);
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
          className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b bg-background"
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
              <div className="p-8 pt-4">
                <div className="max-w-4xl mx-auto text-center space-y-6">
                  {/* 主标题区域 */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="space-y-4"
                  >
                    {/* Logo 图标 */}
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                      className="relative mx-auto w-16 h-16"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80 rounded-xl rotate-3 opacity-20" />
                      <div className="relative bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center w-full h-full shadow-lg">
                        <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                    </motion.div>

                    {/* 标题 */}
                    <div className="space-y-2">
                      <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent"
                      >
                        你好！我是 MatterAI，您可靠的科研伙伴
                      </motion.h1>
                      
                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                        className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed"
                      >
                        专注于材料研发领域。我能协助您进行材料设计、性能分析、工艺优化、机器学习建模、理论计算等研究工作。
                        让我们一起探索材料科学的无限可能！
                      </motion.p>
                    </div>
                  </motion.div>

                  {/* 示例问题 */}
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                    className="space-y-4"
                  >
                    <h2 className="text-lg font-semibold text-foreground">
                      您可以尝试以下材料研发问题
                    </h2>
                    
                    {/* 根据工具选择器状态动态调整间距 */}
                    <div className={cn(
                      "transition-all duration-200",
                      "pb-20" // 工具选择器展开时增加底部间距，避免遮挡
                    )}>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {[
                        { title: "锂电池材料合成", desc: "如何合成高性能的硅纳米线负极材料？" },
                        { title: "合金性能分析", desc: "分析Ti-6Al-4V钛合金的力学性能特征" },
                        { title: "陶瓷材料优化", desc: "利用主动学习算法优化氧化铝陶瓷的烧结工艺参数" },
                        { title: "材料数据收集", desc: "从文献中收集和整理锂电池材料的结构化数据" },
                        { title: "材料表征方法", desc: "使用VASP计算NiO纳米粒子的DOS特性" },
                        { title: "材料组成与性能关系", desc: "利用机器学习方法研究材料组成与性能关系" }
                      ].map((example, index) => (
                        <motion.div
                          key={example.title}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
                          whileHover={{ scale: 1.02, y: -4 }}
                          onClick={() => handleSendMessage(example.desc)}
                          className="p-3 bg-card border border-border rounded-lg cursor-pointer transition-all duration-200 hover:border-primary/30 hover:bg-card/80 shadow-sm hover:shadow-md"
                        >
                          <h3 className="font-medium text-sm text-foreground mb-1">
                            {example.title}
                          </h3>
                          <p className="text-xs text-muted-foreground leading-tight">
                            {example.desc}
                          </p>
                        </motion.div>
                      ))}
                      </div>
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
            selectedTools={selectedTools}
            onToolsChange={handleToolsChange}
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
