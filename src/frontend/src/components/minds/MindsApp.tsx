/**
 * MINDS (Material Interaction Decoupling & Scientific insight extraction) 智能体主应用
 * 材料科学专门智能体，提供多个专业模块
 */

import React, { useState, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import { Sidebar } from '../sidebar/Sidebar';
import { MindsWelcome } from './MindsWelcome';
import { MindsChat } from './MindsChat';
import { cn } from '../../utils/cn';

interface MindsModule {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

const MINDS_MODULES: MindsModule[] = [
  {
    id: 'active-learning',
    name: 'Active Learning',
    description: 'Strategic sampling',
    icon: '🎯',
    color: 'from-green-500 to-emerald-600'
  },
  {
    id: 'shap-analysis',
    name: 'SHAP Analysis',
    description: 'Feature interactions',
    icon: '📊',
    color: 'from-blue-500 to-indigo-600'
  },
  {
    id: 'neural-network',
    name: 'Neural Network',
    description: 'ML modeling',
    icon: '🧠',
    color: 'from-purple-500 to-violet-600'
  },
  {
    id: 'llm-rag',
    name: 'LLM-RAG',
    description: 'Knowledge extraction',
    icon: '📚',
    color: 'from-orange-500 to-red-600'
  }
];

const USER_ID = 'minds_user';

export function MindsApp() {
  const [sidebarOpen, setSidebarOpen] = useState(false); // MINDS默认收起侧边栏
  const [selectedModules, setSelectedModules] = useState<MindsModule[]>([]);
  
  // 设置MINDS的动态标题
  useEffect(() => {
    document.title = 'MINDS Agent - Material Interaction Decoupling & Scientific insight extraction';
  }, []);
  
  const {
    state,
    currentMessages,
    isConnected,
    sendMessage,
    switchSession,
    createNewSession,
  } = useChat(USER_ID);

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

  const handleModuleSelect = (module: MindsModule) => {
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

  const handleSendMessage = async (message: string, files?: FileList) => {
    // 根据选择的模块自动选择对应的工具
    const moduleTools = selectedModules.map(module => `preset-${module.id}`);
    await sendMessage(message, files, moduleTools, undefined, "minds");
  };

  // 判断是否显示欢迎页面
  const showWelcome = !state.currentSessionId || currentMessages.length === 0;

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
        'lg:ml-0',
        sidebarOpen && 'lg:ml-80'
      )}>
        {showWelcome ? (
          <MindsWelcome 
            modules={MINDS_MODULES}
            onModuleSelect={handleModuleSelect}
            selectedModules={selectedModules}
            onSendMessage={handleSendMessage}
          />
        ) : (
          <MindsChat
            messages={currentMessages}
            onSendMessage={handleSendMessage}
            isLoading={state.isLoading}
            isConnected={isConnected}
            selectedModules={selectedModules}
            onModuleSelect={handleModuleSelect}
            modules={MINDS_MODULES}
          />
        )}

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