/**
 * 工具选择器组件
 * 位于输入框上方，支持选择预设工具和自定义工具
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Settings, 
  Check,
  X 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/cn';
import { Tool, PresetTool, CustomTool, PRESET_TOOLS, PRESET_TOOL_TRANSLATION_KEYS, ToolSelectorState } from '../../types/tools';
import { ToolItem } from './ToolItem';
import { CustomToolForm } from './CustomToolForm';

/**
 * 工具选择器属性接口
 */
interface ToolSelectorProps {
  selectedTools: string[];
  onToolsChange: (tools: string[], customTools: CustomTool[]) => void;
  className?: string;
  shouldCollapse?: boolean; // 外部控制是否应该折叠
}

/**
 * 工具选择器组件
 */
export function ToolSelector({
  selectedTools,
  onToolsChange,
  className,
  shouldCollapse = false
}: ToolSelectorProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [customTools, setCustomTools] = useState<CustomTool[]>([]);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [editingTool, setEditingTool] = useState<CustomTool | null>(null);

  // 处理外部控制的折叠
  React.useEffect(() => {
    if (shouldCollapse) {
      setIsExpanded(false);
    }
  }, [shouldCollapse]);

  // 生成预设工具实例 - 使用国际化获取名称和描述
  const presetTools: PresetTool[] = PRESET_TOOLS.map((tool, index) => {
    const translationKey = PRESET_TOOL_TRANSLATION_KEYS[tool.toolType];
    return {
      ...tool,
      id: `preset-${tool.toolType}`,
      name: t(`tools.preset.${translationKey}.name`),
      description: t(`tools.preset.${translationKey}.description`),
      enabled: selectedTools.includes(`preset-${tool.toolType}`)
    };
  });

  // 所有工具列表
  const allTools: Tool[] = [...presetTools, ...customTools];

  // 选中的工具数量
  const selectedCount = selectedTools.length;

  // 切换工具选中状态
  const toggleTool = (toolId: string) => {
    const newSelectedTools = selectedTools.includes(toolId)
      ? selectedTools.filter(id => id !== toolId)
      : [...selectedTools, toolId];
    onToolsChange(newSelectedTools, customTools);
  };

  // 添加自定义工具
  const handleAddCustomTool = (tool: Omit<CustomTool, 'id' | 'enabled'>) => {
    const newTool: CustomTool = {
      ...tool,
      id: `custom-${Date.now()}`,
      enabled: true, // 默认选中新添加的工具
    };
    const newCustomTools = [...customTools, newTool];
    const newSelectedTools = [...selectedTools, newTool.id]; // 自动选中新工具
    setCustomTools(newCustomTools);
    setShowCustomForm(false);
    onToolsChange(newSelectedTools, newCustomTools);
  };

  // 编辑自定义工具
  const handleEditCustomTool = (tool: CustomTool) => {
    setEditingTool(tool);
    setShowCustomForm(true);
  };

  // 更新自定义工具
  const handleUpdateCustomTool = (updatedTool: Omit<CustomTool, 'id' | 'enabled'>) => {
    if (!editingTool) return;
    
    const newCustomTools = customTools.map(tool => 
      tool.id === editingTool.id 
        ? { ...updatedTool, id: editingTool.id, enabled: tool.enabled }
        : tool
    );
    setCustomTools(newCustomTools);
    setEditingTool(null);
    setShowCustomForm(false);
    onToolsChange(selectedTools, newCustomTools);
  };

  // 删除自定义工具
  const handleDeleteCustomTool = (toolId: string) => {
    const newCustomTools = customTools.filter(tool => tool.id !== toolId);
    setCustomTools(newCustomTools);
    onToolsChange(selectedTools.filter(id => id !== toolId), newCustomTools);
  };

  return (
    <div className={cn('w-full', className)}>
      {/* 工具栏头部 */}
      <div className="flex items-center justify-between p-3 border border-border rounded-t-lg bg-muted/30">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{t('tools.toolSelection')}</span>
          {selectedCount > 0 && (
            <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
              {selectedCount}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* 展开/折叠按钮 */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* 工具列表 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-x border-b border-border rounded-b-lg bg-background overflow-hidden"
          >
            <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
              {/* 预设工具 */}
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground font-medium">{t('tools.presetTools')}</div>
                {presetTools.map(tool => (
                  <ToolItem
                    key={tool.id}
                    tool={tool}
                    isSelected={selectedTools.includes(tool.id)}
                    onToggle={() => toggleTool(tool.id)}
                  />
                ))}
              </div>

              {/* 自定义工具 */}
              {customTools.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="text-xs text-muted-foreground font-medium">{t('tools.customTools')}</div>
                  {customTools.map(tool => (
                    <ToolItem
                      key={tool.id}
                      tool={tool}
                      isSelected={selectedTools.includes(tool.id)}
                      onToggle={() => toggleTool(tool.id)}
                      onEdit={() => handleEditCustomTool(tool)}
                      onDelete={() => handleDeleteCustomTool(tool.id)}
                      isCustom
                    />
                  ))}
                </div>
              )}

              {/* 空状态 */}
              {allTools.length === presetTools.length && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  {t('common.add')} + 按钮添加自定义工具
                </div>
              )}

              {/* 底部添加按钮 */}
              <div className="pt-2 border-t mt-2">
                <button
                  onClick={() => {
                    setEditingTool(null);
                    setShowCustomForm(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 p-2 border border-dashed border-muted-foreground/30 rounded-lg text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-sm">{t('tools.addCustomTool')}</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 自定义工具表单模态框 */}
      <AnimatePresence>
        {showCustomForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 py-4 overflow-y-auto"
            onClick={() => {
              setShowCustomForm(false);
              setEditingTool(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background border rounded-lg w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 p-6 pb-4">
                <h3 className="text-lg font-semibold">
                  {editingTool ? t('tools.editTool') : t('tools.addCustomTool')}
                </h3>
                <button
                  onClick={() => {
                    setShowCustomForm(false);
                    setEditingTool(null);
                  }}
                  className="p-1 hover:bg-muted rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              <div className="px-6 pb-6">
                <CustomToolForm
                  initialData={editingTool}
                  onSubmit={editingTool ? handleUpdateCustomTool : handleAddCustomTool}
                  onCancel={() => {
                    setShowCustomForm(false);
                    setEditingTool(null);
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
