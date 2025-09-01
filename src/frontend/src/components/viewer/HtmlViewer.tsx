/**
 * HTML 查看器组件
 * 用于在分屏模式下显示 HTML 文件内容
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Maximize2, Minimize2, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

/**
 * HTML 查看器组件属性接口
 */
interface HtmlViewerProps {
  htmlPath: string; // 可以是绝对路径或http(s) URL
  title?: string;
  onClose: () => void;
  className?: string;
}

/**
 * HTML 查看器组件
 */
export function HtmlViewer({ 
  htmlPath, 
  title = "HTML 预览", 
  onClose, 
  className 
}: HtmlViewerProps) {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 判定是否为URL
  const isHttpUrl = /^https?:\/\//i.test(htmlPath);

  // 加载 HTML 内容
  useEffect(() => {
    const loadHtmlContent = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (isHttpUrl) {
          // 直接使用URL嵌入，不必预取内容
          setHtmlContent('');
          setLoading(false);
          return;
        }
        
        // 通过后端API获取HTML文件内容（端口9000）
        const response = await fetch(`http://localhost:9000/html-content?file_path=${encodeURIComponent(htmlPath)}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        if (data.success && data.content) {
          setHtmlContent(data.content);
        } else {
          throw new Error('服务器返回的数据格式不正确');
        }
      } catch (err) {
        console.error('Failed to load HTML:', err);
        setError(err instanceof Error ? err.message : '加载 HTML 文件失败');
      } finally {
        setLoading(false);
      }
    };

    if (htmlPath) {
      loadHtmlContent();
    }
  }, [htmlPath, isHttpUrl]);

  // 刷新内容
  const handleRefresh = async () => {
    if (!htmlPath) return;
    if (isHttpUrl) {
      // 强制刷新iframe：改变一个一次性query
      const iframe = document.getElementById('html-viewer-iframe') as HTMLIFrameElement | null;
      if (iframe && iframe.src) {
        iframe.src = iframe.src.split('#')[0].split('?')[0] + `?t=${Date.now()}`;
      }
      return;
    }

    setHtmlContent('');
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`http://localhost:9000/html-content?file_path=${encodeURIComponent(htmlPath)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.success && data.content) {
        setHtmlContent(data.content);
      } else {
        throw new Error('服务器返回的数据格式不正确');
      }
    } catch (err) {
      console.error('Failed to refresh HTML:', err);
      setError(err instanceof Error ? err.message : '刷新 HTML 文件失败');
    } finally {
      setLoading(false);
    }
  };

  // 在新窗口中打开
  const handleOpenInNewWindow = () => {
    if (!htmlPath) return;
    if (isHttpUrl) {
      window.open(htmlPath, '_blank');
      return;
    }
    if (htmlContent) {
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const newWindow = window.open(url, '_blank');
      if (newWindow) {
        newWindow.addEventListener('beforeunload', () => {
          URL.revokeObjectURL(url);
        });
      }
    }
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className={cn(
        'flex flex-col bg-background border-l h-full',
        isFullscreen && 'fixed inset-0 z-50 border-0',
        className
      )}
    >
      {/* 头部工具栏 */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-500/10 rounded-lg">
            <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-sm">{title}</h3>
            <p className="text-xs text-muted-foreground truncate max-w-64" title={htmlPath}>
              {htmlPath}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* 刷新按钮 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            title="刷新内容"
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>

          {/* 在新窗口打开 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenInNewWindow}
            title="在新窗口中打开"
            className="h-8 w-8 p-0"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>

          {/* 全屏切换 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "退出全屏" : "全屏显示"}
            className="h-8 w-8 p-0"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>

          {/* 关闭按钮 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            title="关闭"
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>加载中...</span>
            </div>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <div className="p-3 bg-destructive/10 rounded-lg inline-block">
                <svg className="h-8 w-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">加载失败</p>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button onClick={handleRefresh} size="sm">
                  重试
                </Button>
              </div>
            </div>
          </div>
        ) : (
          isHttpUrl ? (
            <iframe
              id="html-viewer-iframe"
              src={htmlPath}
              className="w-full h-full border-0"
              title={title}
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          ) : (
            <iframe
              id="html-viewer-iframe"
              srcDoc={htmlContent}
              className="w-full h-full border-0"
              title={title}
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          )
        )}
      </div>
    </motion.div>
  );
}
