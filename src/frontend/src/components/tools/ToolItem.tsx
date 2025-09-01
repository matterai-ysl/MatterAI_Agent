/**
 * 单个工具项组件
 * 用于显示工具信息和操作按钮
 */

import React from 'react';
import { Check, Edit, Trash2, ExternalLink } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Tool } from '../../types/tools';

/**
 * 工具项属性接口
 */
interface ToolItemProps {
  tool: Tool;
  isSelected: boolean;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isCustom?: boolean;
  className?: string;
}

/**
 * 工具项组件
 */
export function ToolItem({
  tool,
  isSelected,
  onToggle,
  onEdit,
  onDelete,
  isCustom = false,
  className
}: ToolItemProps) {
  return (
    <div 
      className={cn(
        'flex items-center gap-3 p-3 border rounded-lg transition-all duration-200 hover:shadow-sm',
        isSelected 
          ? 'bg-primary/10 border-primary/30 shadow-sm' 
          : 'bg-background border-border hover:bg-muted/50',
        className
      )}
    >
      {/* 选择框 */}
      <button
        onClick={onToggle}
        className={cn(
          'flex items-center justify-center w-5 h-5 border-2 rounded transition-colors',
          isSelected
            ? 'bg-primary border-primary text-primary-foreground'
            : 'border-muted-foreground hover:border-primary'
        )}
      >
        {isSelected && <Check className="h-3 w-3" />}
      </button>

      {/* 工具图标 */}
      <div className="flex-shrink-0">
        {tool.icon ? (
          <span className="text-lg">{tool.icon}</span>
        ) : (
          <div className="w-6 h-6 bg-muted rounded flex items-center justify-center">
            <span className="text-xs text-muted-foreground">
              {tool.name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* 工具信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium truncate">{tool.name}</h4>
          {tool.type === 'custom' && (
            <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
          {tool.description}
        </p>
        
        {/* 自定义工具额外信息 */}
        {tool.type === 'custom' && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
              {tool.transportType.toUpperCase()}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {tool.mcpUrl}
            </span>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      {isCustom && (onEdit || onDelete) && (
        <div className="flex items-center gap-1 flex-shrink-0">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
              title="编辑工具"
            >
              <Edit className="h-3 w-3" />
            </button>
          )}
          
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive transition-colors"
              title="删除工具"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
