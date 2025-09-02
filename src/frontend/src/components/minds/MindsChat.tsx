/**
 * MINDS 智能体聊天界面
 * 复用现有聊天组件，添加模块选择功能
 */

import { useState } from 'react';
import { Settings } from 'lucide-react';
import { ChatMessage } from '../../types/chat';
import { MessageList } from '../chat/MessageList';
import { ChatInput } from '../chat/ChatInput';
import { cn } from '../../utils/cn';

interface MindsModule {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

interface MindsChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string, files?: FileList) => Promise<void>;
  isLoading: boolean;
  isConnected: boolean;
  selectedModules: MindsModule[];
  onModuleSelect: (module: MindsModule) => void;
  modules: MindsModule[];
}

export function MindsChat({ 
  messages, 
  onSendMessage, 
  isLoading, 
  isConnected,
  selectedModules,
  onModuleSelect,
  modules 
}: MindsChatProps) {
  const [showModuleSelector, setShowModuleSelector] = useState(false);

  return (
    <div className="flex-1 flex flex-col">
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-lg">⭐</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">MINDS</h1>
            <p className="text-xs text-muted-foreground">
              Material Interaction Decoupling & Scientific insight extraction
            </p>
          </div>
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        </div>
        
        {/* 当前选择的模块显示 */}
        {selectedModules.length > 0 && (
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              {selectedModules.map((module) => (
                <div
                  key={module.id}
                  className={cn(
                    'px-2 py-1 rounded-md flex items-center space-x-1 text-xs',
                    'bg-primary/10 border border-primary/20'
                  )}
                >
                  <span className="text-xs">{getIconForModule(module.id)}</span>
                  <span className="font-medium text-primary">{module.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setShowModuleSelector(!showModuleSelector)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            title="切换模块"
          >
            <span className="text-sm">🧠</span>
          </button>
          <button className="p-2 hover:bg-muted rounded-lg transition-colors">
            <Settings className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* 模块选择器 */}
      {showModuleSelector && (
        <div className="p-4 bg-muted/30 border-b border-border/50">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {modules.map((module) => (
              <button
                key={module.id}
                onClick={() => {
                  onModuleSelect(module);
                  setShowModuleSelector(false);
                }}
                className={cn(
                  'p-3 rounded-lg border text-left transition-all hover:shadow-sm',
                  selectedModules.some(m => m.id === module.id)
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border hover:border-border/80 hover:bg-background/50'
                )}
              >
                <div className="flex items-center space-x-2">
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center',
                    `bg-gradient-to-br ${getColorForModule(module.id)}`
                  )}>
                    <span className="text-sm">{getIconForModule(module.id)}</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {module.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {module.description}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 消息列表 */}
      <div className="flex-1 overflow-hidden">
        <MessageList 
          messages={messages}
          isLoading={isLoading}
        />
      </div>

      {/* 输入区域 */}
      <div className="border-t border-border/50 bg-background/80 backdrop-blur-sm">
        <ChatInput
          onSendMessage={onSendMessage}
          disabled={isLoading || !isConnected}
          placeholder={selectedModules.length > 0
            ? `Ask ${selectedModules.map(m => m.name).join(', ')} about materials research...`
            : "Describe your materials research challenge or ask about composite design..."
          }
        />
      </div>
    </div>
  );
}

function getIconForModule(moduleId: string): string {
  switch (moduleId) {
    case 'active-learning':
      return '🎯';
    case 'shap-analysis':
      return '📊';
    case 'neural-network':
      return '🧠';
    case 'llm-rag':
      return '📚';
    default:
      return '⚡';
  }
}

function getColorForModule(moduleId: string): string {
  switch (moduleId) {
    case 'active-learning':
      return 'from-green-500 to-emerald-600';
    case 'shap-analysis':
      return 'from-blue-500 to-indigo-600';
    case 'neural-network':
      return 'from-purple-500 to-violet-600';
    case 'llm-rag':
      return 'from-orange-500 to-red-600';
    default:
      return 'from-gray-500 to-slate-600';
  }
}