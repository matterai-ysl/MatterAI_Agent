/**
 * MatNexus 智能体主应用
 * 材料科学专门智能体，提供四个专业模块
 */

import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useChat } from '../../hooks/useChat';
import { NewSidebar } from '../sidebar/NewSidebar';
import { MatNexusWelcome } from './MatNexusWelcome';
import { MatNexusChat } from './MatNexusChat';
import { HtmlViewer } from '../viewer/HtmlViewer';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { cn } from '../../utils/cn';

interface MatNexusModule {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

const MATNEXUS_MODULES: MatNexusModule[] = [
  {
    id: 'mir',
    name: 'MIR',
    description: '材料智能推理',
    icon: '🧠',
    color: 'from-blue-500 to-cyan-600'
  },
  {
    id: 'me',
    name: 'ME',
    description: '记忆表达',
    icon: '💾',
    color: 'from-purple-500 to-pink-600'
  },
  {
    id: 'pei',
    name: 'PEI',
    description: '自动化实验',
    icon: '⚗️',
    color: 'from-green-500 to-teal-600'
  },
  {
    id: 'dc',
    name: 'DC',
    description: '文献数据收集',
    icon: '📚',
    color: 'from-orange-500 to-amber-600'
  }
];

/**
 * MatNexus 应用内容组件
 */
function MatNexusAppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedModules, setSelectedModules] = useState<MatNexusModule[]>([]);
  const [splitViewOpen, setSplitViewOpen] = useState(false);
  const [htmlViewerData, setHtmlViewerData] = useState<{
    htmlPath: string;
    title: string;
  } | null>(null);
  const [highlightedToolId, setHighlightedToolId] = useState<string | null>(null);

  // 设置MatNexus的动态标题
  useEffect(() => {
    document.title = 'MatNexus Agent - Material Nexus Platform';
  }, []);

  const {
    state,
    currentMessages,
    isConnected,
    sendMessage,
    switchSession,
    createNewSession,
  } = useChat('matnexus');

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const handleSessionSelect = async (sessionId: string | null) => {
    setSidebarOpen(false);
    await switchSession(sessionId);
  };

  const handleNewSession = () => {
    setSidebarOpen(false);
    setSelectedModules([]);
    createNewSession();
  };

  const handleModuleSelect = (module: MatNexusModule) => {
    setSelectedModules(prev => {
      const isSelected = prev.some(m => m.id === module.id);
      if (isSelected) {
        // 取消选择
        return prev.filter(m => m.id !== module.id);
      } else {
        // 添加选择
        return [...prev, module];
      }
    });

    // 如果没有当前会话，创建新会话
    if (!state.currentSessionId) {
      createNewSession();
    }
  };

  const handleSendMessage = async (message: string, files?: FileList, selectedTools?: string[], customTools?: any[]) => {
    // 根据选择的模块自动选择对应的工具，合并传入的工具选择
    const moduleTools = selectedModules.map(module => `preset-${module.id}`);
    const finalTools = [...moduleTools, ...(selectedTools || [])];
    await sendMessage(message, files, finalTools, customTools, "matnexus");
  };

  /**
   * 处理 HTML 查看
   */
  const handleViewHtml = (htmlPath: string, title?: string) => {
    console.log('🔍 [MatNexusApp] handleViewHtml 接收到:', { htmlPath, title });
    setHtmlViewerData({
      htmlPath,
      title: title || 'HTML 预览'
    });
    setSplitViewOpen(true);
    setHighlightedToolId(null);
  };

  /**
   * 关闭 HTML 查看器
   */
  const handleCloseHtmlViewer = () => {
    setSplitViewOpen(false);
    setHtmlViewerData(null);
    setHighlightedToolId(null);
  };

  // 判断是否显示欢迎页面
  const showWelcome = !state.currentSessionId || currentMessages.length === 0;

  return (
    <div className="flex h-screen bg-background text-foreground chat-background">
      {/* 侧边栏 */}
      <NewSidebar
        sessions={state.sessions}
        currentSessionId={state.currentSessionId}
        onSessionSelect={handleSessionSelect}
        onNewSession={handleNewSession}
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
        isLoading={state.isLoading && !state.currentSessionId}
        appTitle="MatNexus"
      />

      {/* 主内容区域 */}
      <div className={cn(
        'flex-1 flex h-full min-h-0'
      )}>
        {/* 聊天区域 */}
        <div className={cn(
          'flex flex-col h-full min-h-0 overflow-hidden',
          splitViewOpen ? 'w-1/2 max-w-1/2' : 'flex-1'
        )}>
          {showWelcome ? (
            <MatNexusWelcome
              modules={MATNEXUS_MODULES}
              onModuleSelect={handleModuleSelect}
              selectedModules={selectedModules}
              onSendMessage={handleSendMessage}
              onSidebarToggle={toggleSidebar}
            />
          ) : (
            <MatNexusChat
              messages={currentMessages}
              onSendMessage={handleSendMessage}
              isLoading={state.isLoading}
              isConnected={isConnected}
              selectedModules={selectedModules}
              onModuleSelect={handleModuleSelect}
              modules={MATNEXUS_MODULES}
              onSidebarToggle={toggleSidebar}
              onViewHtml={handleViewHtml}
              highlightedToolId={highlightedToolId || undefined}
            />
          )}
        </div>

        {/* HTML 查看器 - 分屏右侧 */}
        <AnimatePresence>
          {splitViewOpen && htmlViewerData && (
            <div className="w-1/2 h-full border-l flex-shrink-0">
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
      {state.error && (
        <div className="absolute top-4 right-4 z-50">
          <div className="bg-destructive text-destructive-foreground px-4 py-2 rounded-lg shadow-lg max-w-md">
            <div className="font-medium text-sm">连接错误</div>
            <div className="text-sm mt-1">{state.error}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * MatNexus 主应用组件，包含主题提供者
 */
export function MatNexusApp() {
  return (
    <ThemeProvider defaultTheme="light">
      <MatNexusAppContent />
    </ThemeProvider>
  );
}
