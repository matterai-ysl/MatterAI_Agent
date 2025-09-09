/**
 * MINDS 智能体聊天界面
 * 复用现有聊天组件，添加模块选择功能
 */

import { Settings, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ChatMessage } from '../../types/chat';
import { NewMessageList } from '../chat/NewMessageList';
import { NewChatInput } from '../chat/NewChatInput';
import { LanguageToggle } from '../ui/LanguageToggle';
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
  onSendMessage: (message: string, files?: FileList, selectedTools?: string[], customTools?: any[]) => Promise<void>;
  isLoading: boolean;
  isConnected: boolean;
  selectedModules: MindsModule[];
  onModuleSelect: (module: MindsModule) => void;
  modules: MindsModule[];
  onSidebarToggle?: () => void;
  onViewHtml?: (htmlPath: string, title?: string) => void;
  highlightedToolId?: string;
}

export function MindsChat({ 
  messages, 
  onSendMessage, 
  isLoading, 
  isConnected,
  selectedModules,
  onModuleSelect,
  modules,
  onSidebarToggle,
  onViewHtml,
  highlightedToolId
}: MindsChatProps) {
  const { t } = useTranslation();

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* 顶部导航栏 */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-border/50 header-background">
        <div className="flex items-center space-x-3">
          {/* 侧边栏切换按钮 */}
          {onSidebarToggle && (
            <button 
              onClick={onSidebarToggle}
              className="p-2 hover:bg-teal-900/20 rounded-lg transition-colors"
              title={t('minds.history')}
              style={{ color: 'rgba(0, 103, 112, 0.8)' }}
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-lg">⭐</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold" style={{ color: 'rgb(0, 103, 112)' }}>MINDS</h1>
            <p className="text-xs" style={{ color: 'rgba(0, 103, 112, 0.7)' }}>
              Material Interaction Decoupling & Scientific insight extraction
            </p>
          </div>
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
        </div>
        
        {/* 中间Logo区域 */}
        <div className="flex-1 flex justify-center">
          <img 
            src="/assets/images/institute-logo.jpg" 
            alt="Institute Logo"
            className="h-7 object-contain"
          />
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
          {/* 语言切换按钮 */}
          <div style={{ color: 'rgb(0, 103, 112)' }}>
            <LanguageToggle variant="icon" size="sm" />
          </div>
          <button className="p-2 hover:bg-teal-900/20 rounded-lg transition-colors" title={t('sidebar.settings')} style={{ color: 'rgba(0, 103, 112, 0.8)' }}>
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>


      {/* 消息列表：min-h-0 让内部 overflow-y-auto 正常计算高度并显示滚动条 */}
      <div className="flex-1 min-h-0">
        <NewMessageList 
          messages={messages}
          isLoading={isLoading}
          className="h-full"
          botName="MINDS"
          onViewHtml={onViewHtml}
          highlightedToolId={highlightedToolId}
        />
      </div>

      {/* 模块选择器 - 放置在输入框上方 */}
      <div className="flex-shrink-0 p-4 bg-muted/20 border-t border-border/30">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {modules.map((module) => (
            <button
              key={module.id}
              onClick={() => onModuleSelect(module)}
              className={cn(
                'p-2 rounded-lg border text-left transition-all hover:shadow-sm text-xs',
                selectedModules.some(m => m.id === module.id)
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-border hover:border-border/80 hover:bg-background/50'
              )}
            >
              <div className="flex items-center space-x-2">
                <div className={cn(
                  'w-6 h-6 rounded-md flex items-center justify-center',
                  `bg-gradient-to-br ${getColorForModule(module.id)}`
                )}>
                  <span className="text-xs">{getIconForModule(module.id)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-foreground truncate">
                    {module.name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {module.description}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 输入区域（与 MatterAI 一致：不收缩，生成/连接中禁用） */}
      <div className="flex-shrink-0 bg-background/80 backdrop-blur-sm">
        <NewChatInput
          onSendMessage={(msg, files, selectedTools, customTools) => onSendMessage(msg, files, selectedTools, customTools)}
          disabled={isLoading || isConnected}
          placeholder={selectedModules.length > 0
            ? `Ask ${selectedModules.map(m => m.name).join(', ')} about materials research...`
            : "Describe your materials research challenge or ask about composite design..."
          }
          selectedTools={[]}
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