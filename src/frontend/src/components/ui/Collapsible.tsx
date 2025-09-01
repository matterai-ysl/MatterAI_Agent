/**
 * 可折叠组件
 * 用于工具调用结果的展示
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * 可折叠组件属性接口
 */
interface CollapsibleProps {
  title: string | React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  titleClassName?: string;
  contentClassName?: string;
  onOpenChange?: (isOpen: boolean) => void;
}

/**
 * 可折叠组件
 */
export function Collapsible({
  title,
  children,
  defaultOpen = false,
  className,
  titleClassName,
  contentClassName,
  onOpenChange,
}: CollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleToggle = () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    onOpenChange?.(newIsOpen);
  };

  return (
    <div className={cn('border rounded-lg', className)}>
      <button
        onClick={handleToggle}
        className={cn(
          'flex items-center justify-between w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors',
          titleClassName
        )}
      >
        <div className="font-medium text-sm">{title}</div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      
      {isOpen && (
        <div className={cn('px-4 pb-3 border-t', contentClassName)}>
          {children}
        </div>
      )}
    </div>
  );
}
