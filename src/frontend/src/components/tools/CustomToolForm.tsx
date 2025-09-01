/**
 * 自定义工具表单组件
 * 用于添加和编辑自定义工具
 */

import React, { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { CustomTool } from '../../types/tools';

/**
 * 表单数据接口
 */
interface FormData {
  name: string;
  description: string;
  mcpUrl: string;
  transportType: 'http' | 'stdio' | 'sse';
  icon: string;
}

/**
 * 自定义工具表单属性接口
 */
interface CustomToolFormProps {
  initialData?: CustomTool | null;
  onSubmit: (data: Omit<CustomTool, 'id' | 'enabled'>) => void;
  onCancel: () => void;
  className?: string;
}

/**
 * 自定义工具表单组件
 */
export function CustomToolForm({
  initialData,
  onSubmit,
  onCancel,
  className
}: CustomToolFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    mcpUrl: '',
    transportType: 'http',
    icon: '🔧',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 初始化表单数据
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        description: initialData.description,
        mcpUrl: initialData.mcpUrl,
        transportType: initialData.transportType,
        icon: initialData.icon || '🔧',
      });
    }
  }, [initialData]);

  // 更新表单字段
  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除该字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '工具名称不能为空';
    }

    if (!formData.description.trim()) {
      newErrors.description = '工具描述不能为空';
    }

    if (!formData.mcpUrl.trim()) {
      newErrors.mcpUrl = 'MCP URL不能为空';
    } else if (!isValidUrl(formData.mcpUrl)) {
      newErrors.mcpUrl = '请输入有效的URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // URL验证
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        type: 'custom',
        name: formData.name.trim(),
        description: formData.description.trim(),
        mcpUrl: formData.mcpUrl.trim(),
        transportType: formData.transportType,
        icon: formData.icon,
      });
    } catch (error) {
      console.error('Failed to submit form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 常用图标列表
  const iconOptions = ['🔧', '⚙️', '🛠️', '📊', '🤖', '🧪', '📈', '🔍', '💡', '🚀'];

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      {/* 工具名称 */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          工具名称 *
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value)}
          className={cn(
            'w-full px-3 py-2 border rounded-md text-sm',
            'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
            errors.name ? 'border-destructive' : 'border-border'
          )}
          placeholder="输入工具名称"
        />
        {errors.name && (
          <p className="text-xs text-destructive mt-1">{errors.name}</p>
        )}
      </div>

      {/* 工具描述 */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          工具描述 *
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          rows={3}
          className={cn(
            'w-full px-3 py-2 border rounded-md text-sm resize-none',
            'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
            errors.description ? 'border-destructive' : 'border-border'
          )}
          placeholder="描述工具的功能和用途"
        />
        {errors.description && (
          <p className="text-xs text-destructive mt-1">{errors.description}</p>
        )}
      </div>

      {/* MCP URL */}
      <div>
        <label htmlFor="mcpUrl" className="block text-sm font-medium mb-1">
          MCP URL *
        </label>
        <input
          id="mcpUrl"
          type="url"
          value={formData.mcpUrl}
          onChange={(e) => updateField('mcpUrl', e.target.value)}
          className={cn(
            'w-full px-3 py-2 border rounded-md text-sm',
            'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
            errors.mcpUrl ? 'border-destructive' : 'border-border'
          )}
          placeholder="http://127.0.0.1:8000/mcp"
        />
        {errors.mcpUrl && (
          <p className="text-xs text-destructive mt-1">{errors.mcpUrl}</p>
        )}
      </div>

      {/* 传输方式 */}
      <div>
        <label htmlFor="transportType" className="block text-sm font-medium mb-1">
          传输方式
        </label>
        <select
          id="transportType"
          value={formData.transportType}
          onChange={(e) => updateField('transportType', e.target.value as any)}
          className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          <option value="http">HTTP</option>
          <option value="stdio">STDIO</option>
          <option value="sse">SSE</option>
        </select>
      </div>

      {/* 图标选择 */}
      <div>
        <label className="block text-sm font-medium mb-2">
          工具图标
        </label>
        <div className="flex flex-wrap gap-2">
          {iconOptions.map(icon => (
            <button
              key={icon}
              type="button"
              onClick={() => updateField('icon', icon)}
              className={cn(
                'w-8 h-8 border rounded text-lg flex items-center justify-center transition-colors',
                formData.icon === icon
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              )}
            >
              {icon}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={formData.icon}
          onChange={(e) => updateField('icon', e.target.value)}
          className="mt-2 w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          placeholder="或输入自定义emoji"
        />
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-3 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            'bg-primary text-primary-foreground hover:bg-primary/90',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <Save className="h-4 w-4" />
          {isSubmitting ? '保存中...' : initialData ? '更新工具' : '添加工具'}
        </button>
        
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors border border-border hover:bg-muted"
        >
          <X className="h-4 w-4" />
          取消
        </button>
      </div>
    </form>
  );
}
