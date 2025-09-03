/**
 * 工具调用展示组件
 * 以可折叠的形式展示工具调用过程和结果
 */

import React from 'react';
import { Wrench, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { ToolCall, ToolResult } from '../../types/chat';
import { formatDateTime } from '../../utils/format';
import { cn } from '../../utils/cn';
import { Collapsible } from '../ui/Collapsible';

/**
 * 工具调用状态类型
 */
type ToolStatus = 'calling' | 'completed' | 'error';

/**
 * 工具调用展示组件属性接口
 */
interface ToolDisplayProps {
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  className?: string;
  isStreaming?: boolean;
  onViewHtml?: (htmlPath: string, title?: string) => void;
  highlightedToolId?: string;
}

/**
 * 获取工具调用状态
 */
function getToolStatus(toolCall: ToolCall, toolResults: ToolResult[], isStreaming = false): ToolStatus {
  const result = toolResults.find(r => r.name === toolCall.name);
  
  // 如果不是流式状态且有工具调用，默认认为已完成（历史记录情况）
  if (!isStreaming && !result && toolCall) {
    return 'completed';
  }
  
  if (!result) return 'calling';
  
  // 这里可以根据实际需要判断错误状态
  if (result.result && typeof result.result === 'object' && result.result.error) {
    return 'error';
  }
  
  return 'completed';
}

/**
 * 从结果中提取HTML内容信息
 */
function extractHtmlContent(result: any): { htmlPaths: Array<{ key: string; path: string }>; htmlUrls: Array<{ key: string; url: string }> } {
  const htmlPaths: Array<{ key: string; path: string }> = [];
  const htmlUrls: Array<{ key: string; url: string }> = [];
  
  // 🔍 Google ADK 结果处理：优先检查 structuredContent
  let targetContent = result;
  
  // 检查嵌套的 result.result.structuredContent (Google ADK 格式)
  if (result && result.result && result.result.structuredContent && typeof result.result.structuredContent === 'object') {
    console.log('🔍 检测到 Google ADK result.result.structuredContent，使用结构化内容');
    targetContent = result.result.structuredContent;
  }
  // 检查直接的 result.structuredContent (兼容其他格式)
  else if (result && result.structuredContent && typeof result.structuredContent === 'object') {
    console.log('🔍 检测到 result.structuredContent，使用结构化内容');
    targetContent = result.structuredContent;
  }
  
  if (typeof targetContent === 'object' && targetContent) {
    Object.entries(targetContent).forEach(([key, value]) => {
      if (typeof value === 'string') {
        // 首先检查值是否为HTTP(S) URL
        const isHttpUrl = /^https?:\/\//i.test(value);
        
        // HTML相关键名检测（支持描述性前缀）
        const isHtmlKey = key.endsWith('html_path') || 
                         key.endsWith('_url') || 
                         key.endsWith('html_url') || 
                         key.endsWith('report_url') ||
                         key.endsWith('url');
        
        if (isHtmlKey) {
          if (isHttpUrl) {
            // 检查是否为HTML URL：必须以.html结尾，且不是下载链接
            const isHtmlUrl = value.toLowerCase().endsWith('.html') && 
                             !value.toLowerCase().includes('/download/');
            if (isHtmlUrl) {
              // 如果值是HTTP URL且以.html结尾（非下载链接），归类为HTML URL
              htmlUrls.push({ key, url: value });
              console.log(`✅ 检测到HTML URL: ${key} -> ${value}`);
            } else {
              console.log(`🔍 跳过非HTML URL或下载链接: ${key} -> ${value}`);
            }
          } else if (key.endsWith('html_path')) {
            // 如果键名以html_path结尾且值不是URL，归类为本地路径
            htmlPaths.push({ key, path: value });
            console.log(`✅ 检测到HTML路径: ${key} -> ${value}`);
          } else {
            // 其他URL相关键名但值不是HTTP URL，检查是否为HTML文件且不是下载链接
            const isHtmlUrl = value.toLowerCase().endsWith('.html') && 
                             !value.toLowerCase().includes('/download/');
            if (isHtmlUrl) {
              htmlUrls.push({ key, url: value });
              console.log(`✅ 检测到其他HTML URL: ${key} -> ${value}`);
            } else {
              console.log(`🔍 跳过非HTML相对路径或下载链接: ${key} -> ${value}`);
            }
          }
        }
      }
    });
  }
  
  console.log(`🔍 HTML内容提取完成: ${htmlUrls.length}个URL, ${htmlPaths.length}个本地路径`);
  return { htmlPaths, htmlUrls };
}

/**
 * 状态图标组件
 */
function StatusIcon({ status }: { status: ToolStatus }) {
  switch (status) {
    case 'calling':
      return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
  }
}

/**
 * 参数展示组件
 */
function ParametersDisplay({ args }: { args: Record<string, any> }) {
  if (!args || Object.keys(args).length === 0) {
    return <div className="text-muted-foreground text-sm">无参数</div>;
  }

  return (
    <div className="space-y-2">
      {Object.entries(args).map(([key, value]) => (
        <div key={key} className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">{key}:</span>
          <div className="bg-muted rounded p-2 text-sm font-mono">
            {typeof value === 'object' 
              ? JSON.stringify(value, null, 2)
              : String(value)
            }
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 结果展示组件
 */
function ResultDisplay({ 
  result, 
  onViewHtml 
}: { 
  result: any;
  onViewHtml?: (htmlPath: string, title?: string) => void;
}) {
  if (result === null || result === undefined) {
    return <div className="text-muted-foreground text-sm">无结果</div>;
  }

  // 处理错误结果
  if (typeof result === 'object' && result.error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded p-3">
        <div className="text-destructive text-sm font-medium mb-1">错误</div>
        <div className="text-destructive text-sm">{result.error}</div>
      </div>
    );
  }

  // 检查是否包含 html_path 键和 URL
  const { htmlPaths, htmlUrls } = extractHtmlContent(result);

  // 🔍 Google ADK 结果处理：优先显示 structuredContent
  let displayContent = result;
  
  // 检查嵌套的 result.result.structuredContent (Google ADK 格式)
  if (result && result.result && result.result.structuredContent && typeof result.result.structuredContent === 'object') {
    displayContent = result.result.structuredContent;
  }
  // 检查直接的 result.structuredContent (兼容其他格式)
  else if (result && result.structuredContent && typeof result.structuredContent === 'object') {
    displayContent = result.structuredContent;
  }

  // 处理成功结果
  const displayResult = typeof displayContent === 'object' 
    ? JSON.stringify(displayContent, null, 2)
    : String(displayContent);

  return (
    <div className="space-y-3">
      {/* HTML URL 预览按钮 */}
      {htmlUrls.length > 0 && (
        <div className="space-y-2">
          {htmlUrls.map(({ key, url }) => (
            <button
              key={key}
              onClick={() => onViewHtml?.(url, `${key} 预览`)}
              className="flex items-center gap-2 p-3 bg-green-50 hover:bg-green-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 border border-green-200 dark:border-emerald-800 rounded-lg transition-colors w-full text-left group"
            >
              <div className="p-1.5 bg-emerald-500/10 rounded">
                <svg className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-emerald-700 dark:text-emerald-300 group-hover:text-emerald-800 dark:group-hover:text-emerald-200">
                  打开报告（URL）
                </div>
                <div className="text-xs text-emerald-600/70 dark:text-emerald-400/70 truncate">
                  {url}
                </div>
              </div>
              <svg className="h-4 w-4 text-emerald-500 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* HTML 文件预览按钮 */}
      {htmlPaths.length > 0 && (
        <div className="space-y-2">
          {htmlPaths.map(({ key, path }) => (
            <button
              key={key}
              onClick={() => onViewHtml?.(path, `${key} 预览`)}
              className="flex items-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors w-full text-left group"
            >
              <div className="p-1.5 bg-blue-500/10 rounded">
                <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-blue-700 dark:text-blue-300 group-hover:text-blue-800 dark:group-hover:text-blue-200">
                  查看 HTML 报告（文件）
                </div>
                <div className="text-xs text-blue-600/70 dark:text-blue-400/70 truncate">
                  {path}
                </div>
              </div>
              <svg className="h-4 w-4 text-blue-500 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* 原始结果显示 */}
      <div className="bg-muted rounded p-3">
        <pre className="text-sm whitespace-pre-wrap break-words overflow-auto max-h-96">
          {displayResult}
        </pre>
      </div>
    </div>
  );
}

/**
 * 单个工具调用组件
 */
function ToolCallItem({ 
  toolCall, 
  toolResult, 
  status,
  onViewHtml,
  isHighlighted
}: { 
  toolCall: ToolCall; 
  toolResult?: ToolResult; 
  status: ToolStatus;
  onViewHtml?: (htmlPath: string, title?: string) => void;
  isHighlighted?: boolean;
}) {
  const statusText = {
    calling: '执行中...',
    completed: '已完成',
    error: '执行失败',
  };

  const statusColor = {
    calling: 'text-yellow-600',
    completed: 'text-green-600', 
    error: 'text-red-600',
  };

  // 处理工具展开时的自动HTML预览
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && toolResult && onViewHtml) {
      const { htmlPaths, htmlUrls } = extractHtmlContent(toolResult.result);
      
      // 优先使用URL，其次使用路径
      if (htmlUrls.length > 0) {
        const firstUrl = htmlUrls[0];
        onViewHtml(firstUrl.url, `${firstUrl.key} 预览`);
      } else if (htmlPaths.length > 0) {
        const firstPath = htmlPaths[0];
        onViewHtml(firstPath.path, `${firstPath.key} 预览`);
      }
    }
  };

  return (
    <Collapsible
      title={
        <div className="flex items-center gap-2 w-full">
          <Wrench className="h-4 w-4 text-blue-500" />
          <span className="font-medium">{toolCall.name}</span>
          <div className="flex items-center gap-1 ml-auto">
            <StatusIcon status={status} />
            <span className={cn('text-xs', statusColor[status])}>
              {statusText[status]}
            </span>
          </div>
        </div>
      }
      className={cn(
        "bg-muted/30 transition-all duration-200",
        isHighlighted && "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 border"
      )}
      onOpenChange={handleOpenChange}
    >
      <div className="space-y-4 pt-3">
        {/* 调用时间 */}
        <div className="text-xs text-muted-foreground">
          调用时间: {formatDateTime(toolCall.timestamp)}
        </div>

        {/* 参数 */}
        <div>
          <h5 className="text-sm font-medium mb-2">参数</h5>
          <ParametersDisplay args={toolCall.args} />
        </div>

        {/* 结果 */}
        {toolResult && (
          <div>
            <h5 className="text-sm font-medium mb-2">结果</h5>
            <ResultDisplay 
              result={toolResult.result} 
              onViewHtml={onViewHtml}
            />
            <div className="text-xs text-muted-foreground mt-2">
              完成时间: {formatDateTime(toolResult.timestamp)}
            </div>
          </div>
        )}
      </div>
    </Collapsible>
  );
}

/**
 * 工具调用展示组件
 */
export function ToolDisplay({ 
  toolCalls = [], 
  toolResults = [], 
  className,
  isStreaming = false,
  onViewHtml,
  highlightedToolId
}: ToolDisplayProps) {
  if (toolCalls.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2 mb-3">
        <Wrench className="h-4 w-4 text-blue-500" />
        <span className="text-sm font-medium text-muted-foreground">
          工具调用 ({toolCalls.length})
        </span>
      </div>

      {toolCalls.map((toolCall) => {
        const toolResult = toolResults.find(r => r.name === toolCall.name);
        const status = getToolStatus(toolCall, toolResults, isStreaming);

        return (
          <ToolCallItem
            key={toolCall.id}
            toolCall={toolCall}
            toolResult={toolResult}
            status={status}
            onViewHtml={onViewHtml}
            isHighlighted={highlightedToolId === toolCall.id}
          />
        );
      })}
    </div>
  );
}
