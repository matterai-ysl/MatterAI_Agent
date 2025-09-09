/**
 * 语言切换组件
 * 支持中英文切换
 */

import React from 'react';
import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/cn';
import { Button } from './Button';

interface LanguageToggleProps {
  className?: string;
  variant?: 'icon' | 'text';
  size?: 'sm' | 'md' | 'lg';
}

export function LanguageToggle({ 
  className, 
  variant = 'icon',
  size = 'md' 
}: LanguageToggleProps) {
  const { i18n, t } = useTranslation();
  
  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  const currentLang = i18n.language === 'zh' ? '中' : 'EN';
  const targetLang = i18n.language === 'zh' ? t('common.english') : t('common.chinese');

  if (variant === 'text') {
    return (
      <Button
        onClick={toggleLanguage}
        variant="outline"
        size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default'}
        className={cn('gap-2', className)}
        title={`${t('common.language')}: ${targetLang}`}
      >
        <Languages className="h-4 w-4" />
        <span>{currentLang}</span>
      </Button>
    );
  }

  return (
    <Button
      onClick={toggleLanguage}
      variant="ghost"
      size="icon"
      className={cn(
        'relative',
        size === 'sm' && 'h-8 w-8',
        size === 'lg' && 'h-12 w-12',
        className
      )}
      title={`${t('common.language')}: ${targetLang}`}
    >
      <div className="flex items-center justify-center">
        <Languages className={cn(
          'h-4 w-4',
          size === 'sm' && 'h-3 w-3',
          size === 'lg' && 'h-5 w-5'
        )} />
        <span className={cn(
          'absolute -bottom-0.5 -right-0.5 text-xs font-bold bg-primary text-primary-foreground rounded-full px-1 min-w-[16px] h-4 flex items-center justify-center leading-none',
          size === 'sm' && 'text-[10px] h-3 min-w-[12px]',
          size === 'lg' && 'text-sm h-5 min-w-[20px]'
        )}>
          {currentLang}
        </span>
      </div>
    </Button>
  );
}