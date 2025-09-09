/**
 * 消息操作按钮组件
 * 包含复制、重新生成、评分等功能
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Copy, RotateCcw, ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ChatMessage } from '../../types/chat';
import { Button } from '../ui/Button';

interface MessageActionsProps {
  message: ChatMessage;
  onCopy: () => void;
  onRegenerate: () => void;
  onRating: (rating: 'up' | 'down') => void;
  copied: boolean;
}

export function MessageActions({ 
  message, 
  onCopy, 
  onRegenerate, 
  onRating, 
  copied 
}: MessageActionsProps) {
  const { t } = useTranslation();
  const isAssistant = message.role === 'assistant';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity"
    >
      {/* 复制按钮 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onCopy}
        className="h-8 px-2 text-xs"
        title={copied ? t('chat.copied') : t('chat.copy')}
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-500" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
        <span className="ml-1">
          {copied ? t('chat.copied') : t('chat.copy')}
        </span>
      </Button>
      
      {/* 重新生成按钮 - 仅对AI消息显示 */}
      {isAssistant && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRegenerate}
          className="h-8 px-2 text-xs"
          title={t('chat.regenerate')}
        >
          <RotateCcw className="h-3 w-3" />
          <span className="ml-1">{t('chat.regenerate')}</span>
        </Button>
      )}
      
      {/* 评分按钮 - 仅对AI消息显示 */}
      {isAssistant && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRating('up')}
            className="h-8 px-2 text-xs"
            title={t('chat.thumbsUp')}
          >
            <ThumbsUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRating('down')}
            className="h-8 px-2 text-xs"
            title={t('chat.thumbsDown')}
          >
            <ThumbsDown className="h-3 w-3" />
          </Button>
        </>
      )}
    </motion.div>
  );
}