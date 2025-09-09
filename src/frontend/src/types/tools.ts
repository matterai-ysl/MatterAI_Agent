/**
 * 工具相关类型定义
 */

/**
 * 预设工具类型
 */
export type PresetToolType = 'material-knowledge' | 'xgboost' | 'material-extraction' | 'neural-network' | 'random-forest' | 'support-vector-machine';

/**
 * 工具基础接口
 */
export interface BaseTool {
  id: string;
  name?: string;
  description?: string;
  icon?: string;
  enabled: boolean;
}

/**
 * 预设工具
 */
export interface PresetTool extends BaseTool {
  type: 'preset';
  toolType: PresetToolType;
  name: string;
  description: string;
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
 * 预设工具配置映射表 - 提供翻译键的映射
 */
export const PRESET_TOOL_TRANSLATION_KEYS: Record<PresetToolType, string> = {
  'material-knowledge': 'materialKnowledge',
  'xgboost': 'xgboost', 
  'material-extraction': 'materialExtraction',
  'neural-network': 'neuralNetwork',
  'random-forest': 'randomForest',
  'support-vector-machine': 'supportVectorMachine',
};

/**
 * 预设工具配置 - 基础配置，名称和描述通过国际化获取
 */
export const PRESET_TOOLS: Omit<PresetTool, 'id' | 'enabled' | 'name' | 'description'>[] = [
  {
    type: 'preset',
    toolType: 'material-knowledge',
    icon: '🧪',
  },
  {
    type: 'preset',
    toolType: 'xgboost',
    icon: '🤖',
  },
  {
    type: 'preset',
    toolType: 'material-extraction',
    icon: '📚',
  },
  {
    type: 'preset',
    toolType: 'neural-network',
    icon: '🧠',
  },
  {
    type: 'preset',
    toolType: 'random-forest',
    icon: '🌲🌲',
  },
  {
    type: 'preset',
    toolType: 'support-vector-machine',
    icon: '⚖️',
  },
];
