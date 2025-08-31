/**
 * 聊天输入组件
 * 支持文本输入、文件上传和发送控制
 */

import React, { useState, useRef, useCallback, KeyboardEvent } from 'react';
import { Send, Paperclip, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import { FileUpload } from './FileUpload';

/**
 * 聊天输入组件属性接口
 */
interface ChatInputProps {
  onSendMessage: (message: string, files?: FileList) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * 聊天输入组件
 */
export function ChatInput({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "输入消息...",
  className 
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * 调整文本框高度
   */
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const maxHeight = 120; // 最大高度
      const scrollHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${scrollHeight}px`;
    }
  }, []);

  /**
   * 处理输入变化
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    adjustTextareaHeight();
  }, [adjustTextareaHeight]);

  /**
   * 处理发送
   */
  const handleSend = useCallback(() => {
    const trimmedMessage = message.trim();
    
    // 检查是否有内容可发送
    if (!trimmedMessage && !files?.length) {
      return;
    }

    // 发送消息
    onSendMessage(trimmedMessage, files || undefined);

    // 重置状态
    setMessage('');
    setFiles(null);
    setShowFileUpload(false);

    // 重置文本框高度
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [message, files, onSendMessage]);

  /**
   * 处理键盘事件
   */
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  /**
   * 处理文件变化
   */
  const handleFilesChange = useCallback((newFiles: FileList | null) => {
    setFiles(newFiles);
  }, []);

  /**
   * 切换文件上传面板
   */
  const toggleFileUpload = useCallback(() => {
    setShowFileUpload(prev => !prev);
  }, []);

  const canSend = (message.trim().length > 0 || files?.length) && !disabled;

  return (
    <div className={cn('border-t bg-background', className)}>
      {/* 文件上传面板 */}
      {showFileUpload && (
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-sm">文件上传</h4>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFileUpload}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <FileUpload
            onFilesChange={handleFilesChange}
            acceptedTypes={[
              'image/*',
              'application/pdf',
              'text/*',
              '.doc',
              '.docx',
              '.xls',
              '.xlsx',
              '.ppt',
              '.pptx'
            ]}
            maxFiles={5}
            maxFileSize={10 * 1024 * 1024} // 10MB
            disabled={disabled}
          />
        </div>
      )}

      {/* 输入区域 */}
      <div className="p-4">
        <div className="flex items-end gap-2">
          {/* 附件按钮 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFileUpload}
            disabled={disabled}
            className={cn(
              'flex-shrink-0 h-10 w-10',
              showFileUpload && 'bg-muted'
            )}
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          {/* 文本输入框 */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className={cn(
                'w-full resize-none rounded-lg border border-input bg-transparent px-4 py-3 text-sm',
                'placeholder:text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'min-h-[44px] max-h-[120px]'
              )}
            />

            {/* 文件计数 */}
            {files && files.length > 0 && (
              <div className="absolute bottom-1 right-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded">
                {files.length} 个文件
              </div>
            )}
          </div>

          {/* 发送按钮 */}
          <Button
            onClick={handleSend}
            disabled={!canSend}
            size="icon"
            className="flex-shrink-0 h-10 w-10"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* 输入提示 */}
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>
            {files && files.length > 0 
              ? `已选择 ${files.length} 个文件`
              : '支持文本、图片、文档等多种格式'
            }
          </span>
          <span>Shift + Enter 换行，Enter 发送</span>
        </div>
      </div>
    </div>
  );
}
