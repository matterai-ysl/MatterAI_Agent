/**
 * MatNexus 智能体聊天界面
 * 复用现有聊天组件，添加模块选择功能
 */

import { Settings, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ChatMessage } from '../../types/chat';
import { NewMessageList } from '../chat/NewMessageList';
import { NewChatInput } from '../chat/NewChatInput';
import { LanguageToggle } from '../ui/LanguageToggle';
import { cn } from '../../utils/cn';

interface MatNexusModule {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

interface MatNexusChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string, files?: FileList, selectedTools?: string[], customTools?: any[]) => Promise<void>;
  isLoading: boolean;
  isConnected: boolean;
  selectedModules: MatNexusModule[];
  onModuleSelect: (module: MatNexusModule) => void;
  modules: MatNexusModule[];
  onSidebarToggle?: () => void;
  onViewHtml?: (htmlPath: string, title?: string) => void;
  highlightedToolId?: string;
}

export function MatNexusChat({
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
}: MatNexusChatProps) {
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
              title="历史记录"
              style={{ color: 'rgba(0, 103, 112, 0.8)' }}
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-lg">🔗</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold" style={{ color: 'rgb(0, 103, 112)' }}>MatNexus</h1>
            <p className="text-xs" style={{ color: 'rgba(0, 103, 112, 0.7)' }}>
              Material Nexus Platform
            </p>
          </div>
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
        </div>

        {/* 中间Logo区域 */}
        <div className="flex-1 flex justify-center">
          {/* Logo placeholder - 可以后续添加 */}
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
          botName="MatNexus"
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
            ? `与 ${selectedModules.map(m => m.name).join('、')} 对话...`
            : "描述您的材料研究需求或提出问题..."
          }
          selectedTools={[]}
        />
      </div>
    </div>
  );
}

function getIconForModule(moduleId: string): string {
  switch (moduleId) {
    case 'mir':
      return '🧠';
    case 'me':
      return '💾';
    case 'pei':
      return '⚗️';
    case 'dc':
      return '📚';
    default:
      return '⚡';
  }
}

function getColorForModule(moduleId: string): string {
  switch (moduleId) {
    case 'mir':
      return 'from-blue-500 to-cyan-600';
    case 'me':
      return 'from-purple-500 to-pink-600';
    case 'pei':
      return 'from-green-500 to-teal-600';
    case 'dc':
      return 'from-orange-500 to-amber-600';
    default:
      return 'from-gray-500 to-slate-600';
  }
}
