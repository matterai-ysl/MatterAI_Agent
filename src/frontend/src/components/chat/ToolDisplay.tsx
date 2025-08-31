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
function ResultDisplay({ result }: { result: any }) {
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

  // 处理成功结果
  const displayResult = typeof result === 'object' 
    ? JSON.stringify(result, null, 2)
    : String(result);

  return (
    <div className="bg-muted rounded p-3">
      <pre className="text-sm whitespace-pre-wrap break-words overflow-auto max-h-96">
        {displayResult}
      </pre>
    </div>
  );
}

/**
 * 单个工具调用组件
 */
function ToolCallItem({ 
  toolCall, 
  toolResult, 
  status 
}: { 
  toolCall: ToolCall; 
  toolResult?: ToolResult; 
  status: ToolStatus; 
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
      className="bg-muted/30"
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
            <ResultDisplay result={toolResult.result} />
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
  isStreaming = false
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
          />
        );
      })}
    </div>
  );
}
