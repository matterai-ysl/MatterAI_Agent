/**
 * 现代化聊天输入组件
 * 支持文本输入、文件上传和发送控制，具有现代化设计
 */

import React, { useState, useRef, useCallback, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Paperclip, 
  X, 
  Smile, 
  Mic, 
  Square,
  Image as ImageIcon
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import { ToolSelector } from '../tools/ToolSelector';
import { CustomTool } from '../../types/tools';

/**
 * 聊天输入组件属性接口
 */
interface ChatInputProps {
  onSendMessage: (message: string, files?: FileList, selectedTools?: string[], customTools?: CustomTool[]) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  selectedTools?: string[];
  onToolsChange?: (tools: string[], customTools: CustomTool[]) => void;
}

/**
 * 文件预览组件
 */
function FilePreview({ 
  files, 
  onRemove 
}: { 
  files: FileList;
  onRemove: (index: number) => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="flex flex-wrap gap-2 p-3 bg-muted/50 border-t"
      >
        {Array.from(files).map((file, index) => (
          <motion.div
            key={`${file.name}-${index}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2 px-3 py-2 bg-background border rounded-lg text-sm"
          >
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <span className="truncate max-w-32">{file.name}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(index)}
              className="h-5 w-5 p-0 hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </Button>
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * 快捷操作按钮
 */
function QuickActions({ 
  onFileUpload, 
  onEmojiClick,
  onVoiceClick,
  disabled 
}: {
  onFileUpload: () => void;
  onEmojiClick?: () => void;
  onVoiceClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={onFileUpload}
        disabled={disabled}
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
      >
        <Paperclip className="h-4 w-4" />
      </Button>
      
      {onEmojiClick && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onEmojiClick}
          disabled={disabled}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Smile className="h-4 w-4" />
        </Button>
      )}
      
      {onVoiceClick && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onVoiceClick}
          disabled={disabled}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Mic className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

/**
 * 发送按钮
 */
function SendButton({ 
  canSend, 
  isLoading, 
  onClick 
}: { 
  canSend: boolean;
  isLoading?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.div
      whileHover={canSend ? { scale: 1.05 } : {}}
      whileTap={canSend ? { scale: 0.95 } : {}}
    >
      <Button
        onClick={onClick}
        disabled={!canSend}
        size="icon"
        className={cn(
          "h-8 w-8 rounded-lg transition-all duration-200",
          canSend 
            ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-md" 
            : "bg-muted text-muted-foreground cursor-not-allowed"
        )}
      >
        {isLoading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Square className="h-4 w-4" />
          </motion.div>
        ) : (
          <span className="text-lg">🚀</span>
        )}
      </Button>
    </motion.div>
  );
}

/**
 * 现代化聊天输入组件
 */
export function NewChatInput({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "向 MatterAI 发送消息...",
  className,
  selectedTools = [],
  onToolsChange
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [isRecording, setIsRecording] = useState(false); // TODO: 实现语音录制功能
  const [customTools, setCustomTools] = useState<CustomTool[]>([]);
  const [shouldCollapseTools, setShouldCollapseTools] = useState(false);
  const [isComposing, setIsComposing] = useState(false); // IME组合状态
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    onSendMessage(trimmedMessage, files || undefined, selectedTools, customTools);

    // 触发工具选择器折叠
    setShouldCollapseTools(true);
    
    // 重置状态
    setMessage('');
    setFiles(null);
    
    // 重置工具折叠状态
    setTimeout(() => setShouldCollapseTools(false), 100);

    // 重置文本框高度
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [message, files, selectedTools, customTools, onSendMessage]);

  /**
   * 处理工具变更
   */
  const handleToolsChange = useCallback((tools: string[], newCustomTools: CustomTool[]) => {
    setCustomTools(newCustomTools);
    onToolsChange?.(tools, newCustomTools);
  }, [onToolsChange]);

  /**
   * 处理键盘事件
   */
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    // 禁用Enter发送，只允许Shift+Enter换行
    // Enter键不再发送消息，只能点击发送按钮
    if (e.key === 'Enter' && !e.shiftKey) {
      // 不阻止默认行为，允许Enter换行
      // e.preventDefault();
      // handleSend();
    }
  }, [handleSend, isComposing]);

  /**
   * 处理IME输入开始
   */
  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);

  /**
   * 处理IME输入结束
   */
  const handleCompositionEnd = useCallback(() => {
    setIsComposing(false);
  }, []);

  /**
   * 处理文件选择
   */
  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * 处理文件变化
   */
  const handleFilesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      setFiles(selectedFiles);
    }
  }, []);

  /**
   * 移除文件
   */
  const handleRemoveFile = useCallback((index: number) => {
    if (files) {
      const fileArray = Array.from(files);
      fileArray.splice(index, 1);
      
      // 创建新的 FileList
      const dt = new DataTransfer();
      fileArray.forEach(file => dt.items.add(file));
      setFiles(dt.files.length > 0 ? dt.files : null);
    }
  }, [files]);


  /**
   * 处理语音录制
   */
  const handleVoiceClick = useCallback(() => {
    setIsRecording(prev => !prev);
    // TODO: 实现语音录制功能
  }, []);

  const canSend = (message.trim().length > 0 || (files?.length ?? 0) > 0) && !disabled;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('border-t bg-background', className)}
    >
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,text/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
        onChange={handleFilesChange}
        className="hidden"
      />


      {/* 工具选择器 */}
      {onToolsChange && (
        <div className="px-4 pt-2 pb-1 bg-background/95 backdrop-blur-sm">
          <ToolSelector
            selectedTools={selectedTools}
            onToolsChange={handleToolsChange}
            shouldCollapse={shouldCollapseTools}
          />
        </div>
      )}

      {/* 文件预览 */}
      {files && files.length > 0 && (
        <FilePreview files={files} onRemove={handleRemoveFile} />
      )}

      {/* 输入区域 */}
      <div className="px-4 pt-1 pb-4">
        <div
          className={cn(
            "flex items-end gap-3 p-3 rounded-2xl border border-border bg-background",
            "focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20",
            "transition-all duration-200",
            disabled && "opacity-50"
          )}
        >
          {/* 快捷操作 */}
          <QuickActions
            onFileUpload={handleFileSelect}
            onVoiceClick={handleVoiceClick}
            disabled={disabled}
          />

          {/* 文本输入框 */}
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className={cn(
                'w-full resize-none border-0 bg-transparent text-sm',
                'placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-0',
                'min-h-[24px] max-h-[120px]',
                'scrollbar-thin'
              )}
            />
          </div>

          {/* 发送按钮 */}
          <SendButton
            canSend={canSend}
            isLoading={disabled}
            onClick={handleSend}
          />
        </div>

        {/* 输入提示 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-between mt-3 px-1"
        >
          <div className="text-xs text-muted-foreground">
            {files && files.length > 0 ? (
              <span className="flex items-center gap-1">
                <ImageIcon className="h-3 w-3" />
                已选择 {files.length} 个文件
              </span>
            ) : (
              <span>支持材料数据、研究报告、图片等多种格式</span>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd>
            <span>换行，点击🚀发送</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
