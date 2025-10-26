/**
 * MatNexus 智能体欢迎页面
 * 展示品牌信息和专业模块选择
 */

import React from 'react';
import { Settings, Menu } from 'lucide-react';
import { cn } from '../../utils/cn';
import { NewChatInput } from '../chat/NewChatInput';
import { LanguageToggle } from '../ui/LanguageToggle';

interface MatNexusModule {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

interface MatNexusWelcomeProps {
  modules: MatNexusModule[];
  onModuleSelect: (module: MatNexusModule) => void;
  selectedModules: MatNexusModule[];
  onSendMessage?: (message: string, files?: FileList) => void;
  onSidebarToggle?: () => void;
}

interface ModuleChipProps {
  module: MatNexusModule;
  isSelected: boolean;
  onToggle: () => void;
}

function ModuleChip({ module, isSelected, onToggle }: ModuleChipProps) {
  const getIconForModule = (moduleId: string) => {
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
  };

  const getColorForModule = (moduleId: string) => {
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
  };

  return (
    <button
      onClick={onToggle}
      className={cn(
        'inline-flex items-center space-x-3 px-4 py-3 rounded-lg border transition-all duration-200',
        'hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20',
        isSelected
          ? 'border-primary/50 bg-primary/10 shadow-sm text-primary'
          : 'border-border hover:border-border/80 hover:bg-muted/30 text-muted-foreground'
      )}
    >
      <div className={cn(
        'w-6 h-6 rounded-md flex items-center justify-center text-sm flex-shrink-0',
        `bg-gradient-to-br ${getColorForModule(module.id)}`
      )}>
        <span className="text-white text-xs">
          {getIconForModule(module.id)}
        </span>
      </div>
      <div className="flex flex-col items-start">
        <span className="text-sm font-medium">
          {module.name}
        </span>
        <span className="text-xs opacity-70">
          {module.description}
        </span>
      </div>
    </button>
  );
}

export function MatNexusWelcome({ modules, onModuleSelect, selectedModules, onSendMessage, onSidebarToggle }: MatNexusWelcomeProps) {
  return (
    <div className="flex-1 flex flex-col">
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 header-background">
        <div className="flex items-center space-x-3">
          {/* 历史记录按钮 */}
          {onSidebarToggle && (
            <button
              onClick={onSidebarToggle}
              className="p-2 hover:bg-teal-900/20 rounded-lg transition-colors"
              title="历史记录"
              style={{ color: 'rgba(0, 103, 112, 0.8)' }}
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center space-x-3">
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
        </div>

        {/* 中间Logo区域 */}
        <div className="flex-1 flex justify-center">
          {/* Logo placeholder - 可以后续添加 */}
        </div>

        <div className="flex items-center space-x-2">
          {/* 语言切换按钮 */}
          <div style={{ color: 'rgb(0, 103, 112)' }}>
            <LanguageToggle variant="icon" size="sm" />
          </div>
          <button className="p-2 hover:bg-teal-900/20 rounded-lg transition-colors" style={{ color: 'rgba(0, 103, 112, 0.8)' }}>
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
          {/* 欢迎消息 */}
          <div className="p-6">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 mt-1">
                <span className="text-xl">🔬</span>
              </div>
              <div className="flex-1 bg-muted/30 rounded-2xl p-6 border border-border/50">
                <div className="text-base text-foreground leading-relaxed">
                  欢迎使用 MatNexus 材料科学智能平台！我整合了材料智能推理（MIR）、记忆表达（ME）、自动化实验（PEI）和文献数据收集（DC）四大模块，能够帮助您进行材料研究、实验设计、数据分析和文献调研。请选择您需要的功能模块开始对话。
                </div>
                <div className="text-xs text-muted-foreground mt-3">
                  {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>

          {/* 中间留白区域 */}
          <div className="flex-1"></div>

          {/* 底部输入区域 */}
          <div className="mt-auto">
            {/* 模块选择器 - 紧贴输入框上方 */}
            <div className="px-6 pb-2">
              <div className="flex flex-wrap gap-2 justify-center">
                {modules.map((module) => (
                  <ModuleChip
                    key={module.id}
                    module={module}
                    isSelected={selectedModules.some(m => m.id === module.id)}
                    onToggle={() => onModuleSelect(module)}
                  />
                ))}
              </div>
            </div>

            {/* 输入框区域 */}
            <div>
              <NewChatInput
                onSendMessage={(message, files) => {
                  if (onSendMessage) {
                    onSendMessage(message, files);
                  }
                }}
                placeholder={selectedModules.length > 0
                  ? `与 ${selectedModules.map(m => m.name).join('、')} 对话...`
                  : "描述您的材料研究需求或提出问题..."
                }
                className="border-none bg-transparent"
                selectedTools={[]}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
