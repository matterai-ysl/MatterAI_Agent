/**
 * 文件上传组件
 * 支持拖拽上传和点击上传
 */

import React, { useRef, useState, useCallback } from 'react';
import { Upload, X, File, Image, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatFileSize, isValidFileType, getFileIconType } from '../../utils/format';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';

/**
 * 文件项接口
 */
interface FileItem {
  file: File;
  id: string;
  preview?: string;
}

/**
 * 文件上传组件属性接口
 */
interface FileUploadProps {
  onFilesChange: (files: FileList | null) => void;
  acceptedTypes?: string[];
  maxFiles?: number;
  maxFileSize?: number; // bytes
  disabled?: boolean;
  className?: string;
}

/**
 * 文件图标组件
 */
function FileIcon({ type, className }: { type: string; className?: string }) {
  const icons = {
    image: Image,
    pdf: FileText,
    document: FileText,
    text: FileText,
    file: File,
  };

  const IconComponent = icons[type as keyof typeof icons] || File;
  return <IconComponent className={className} />;
}

/**
 * 文件预览组件
 */
function FilePreview({ 
  fileItem, 
  onRemove 
}: { 
  fileItem: FileItem; 
  onRemove: () => void; 
}) {
  const iconType = getFileIconType(fileItem.file.name);

  return (
    <div className="relative group">
      <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
        <FileIcon type={iconType} className="h-8 w-8 text-blue-500 flex-shrink-0" />
        
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">
            {fileItem.file.name}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatFileSize(fileItem.file.size)}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* 图片预览 */}
      {fileItem.preview && (
        <div className="mt-2">
          <img
            src={fileItem.preview}
            alt={fileItem.file.name}
            className="max-w-full h-32 object-cover rounded border"
          />
        </div>
      )}
    </div>
  );
}

/**
 * 文件上传组件
 */
export function FileUpload({
  onFilesChange,
  acceptedTypes = ['*/*'],
  maxFiles = 5,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  disabled = false,
  className,
}: FileUploadProps) {
  const { t } = useTranslation();
  const [fileItems, setFileItems] = useState<FileItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 处理文件选择
   */
  const handleFiles = useCallback(async (files: FileList) => {
    const validFiles: FileItem[] = [];

    for (let i = 0; i < files.length && validFiles.length < maxFiles; i++) {
      const file = files[i];

      // 验证文件类型
      if (!isValidFileType(file, acceptedTypes)) {
        continue;
      }

      // 验证文件大小
      if (file.size > maxFileSize) {
        continue;
      }

      // 创建文件项
      const fileItem: FileItem = {
        file,
        id: `${Date.now()}-${i}`,
      };

      // 为图片生成预览
      if (file.type.startsWith('image/')) {
        try {
          const preview = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
          });
          fileItem.preview = preview;
        } catch (error) {
          console.error(t('chat.previewFailed'), error);
        }
      }

      validFiles.push(fileItem);
    }

    setFileItems(prev => {
      const newItems = [...prev, ...validFiles];
      
      // 创建新的 FileList
      const dt = new DataTransfer();
      newItems.forEach(item => dt.items.add(item.file));
      
      onFilesChange(dt.files);
      return newItems;
    });
  }, [acceptedTypes, maxFiles, maxFileSize, onFilesChange]);

  /**
   * 移除文件
   */
  const removeFile = useCallback((id: string) => {
    setFileItems(prev => {
      const newItems = prev.filter(item => item.id !== id);
      
      if (newItems.length === 0) {
        onFilesChange(null);
      } else {
        const dt = new DataTransfer();
        newItems.forEach(item => dt.items.add(item.file));
        onFilesChange(dt.files);
      }
      
      return newItems;
    });
  }, [onFilesChange]);

  /**
   * 处理文件输入变化
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFiles(files);
    }
    // 清空输入值，允许重复选择同一文件
    e.target.value = '';
  }, [handleFiles]);

  /**
   * 处理拖拽事件
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (!disabled && e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  }, [disabled, handleFiles]);

  /**
   * 打开文件选择器
   */
  const openFileSelector = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* 上传区域 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileSelector}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          isDragOver && !disabled && 'border-primary bg-primary/5',
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled && 'hover:border-primary/50 hover:bg-muted/30'
        )}
      >
        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        
        <div className="space-y-2">
          <p className="text-sm font-medium">
            {isDragOver ? t('chat.dropFiles') : t('chat.dragOrClick')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('chat.supportedFormats')}，最大 {formatFileSize(maxFileSize)}
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {/* 文件列表 */}
      {fileItems.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">{t('chat.selectedFiles', { count: fileItems.length })}</h4>
          <div className="space-y-2">
            {fileItems.map((fileItem) => (
              <FilePreview
                key={fileItem.id}
                fileItem={fileItem}
                onRemove={() => removeFile(fileItem.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
