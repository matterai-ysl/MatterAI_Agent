/**
 * 工具相关类型定义
 */

/**
 * 预设工具类型
 */
export type PresetToolType = 'material-knowledge' | 'xgboost' | 'material-extraction';

/**
 * 工具基础接口
 */
export interface BaseTool {
  id: string;
  name: string;
  description: string;
  icon?: string;
  enabled: boolean;
}

/**
 * 预设工具
 */
export interface PresetTool extends BaseTool {
  type: 'preset';
  toolType: PresetToolType;
}

/**
 * 自定义工具
 */
export interface CustomTool extends BaseTool {
  type: 'custom';
  mcpUrl: string;
  transportType: 'http' | 'stdio' | 'sse';
  config?: Record<string, any>;
}

/**
 * 工具联合类型
 */
export type Tool = PresetTool | CustomTool;

/**
 * 工具选择器状态
 */
export interface ToolSelectorState {
  isExpanded: boolean;
  selectedTools: string[]; // 工具ID列表
  customTools: CustomTool[];
}

/**
 * 预设工具配置
 */
export const PRESET_TOOLS: Omit<PresetTool, 'id' | 'enabled'>[] = [
  {
    type: 'preset',
    toolType: 'material-knowledge',
    name: '材料领域知识',
    description: '提供材料科学相关的专业知识和信息',
    icon: '🧪',
  },
  {
    type: 'preset',
    toolType: 'xgboost',
    name: 'XGBoost',
    description: '机器学习模型训练和预测工具',
    icon: '🤖',
  },
  {
    type: 'preset',
    toolType: 'material-extraction',
    name: '材料结构化数据提取',
    description: '从文本中提取材料相关的结构化数据',
    icon: '📊',
  },
];
