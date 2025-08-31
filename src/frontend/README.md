# MatterAI Agent Frontend

企业级智能体前端应用，类似 Claude 的聊天界面，支持流式输出、文件上传、工具调用展示等功能。

## 功能特性

### 🚀 核心功能
- **流式对话**：实时显示智能体回复，支持 SSE 流式输出
- **历史记录**：左侧面板显示会话历史，支持快速切换
- **文件上传**：支持多种文件格式上传，包括图片、文档等
- **工具调用**：可折叠展示工具调用过程和结果
- **响应式设计**：适配桌面端和移动端

### 💡 用户体验
- **优雅的 UI**：基于 Tailwind CSS 的现代化设计
- **流畅动画**：消息加载、工具调用状态指示
- **智能交互**：键盘快捷键、拖拽上传等
- **错误处理**：友好的错误提示和重试机制

### 🛠 技术栈
- **React 18** + **TypeScript** - 现代化前端框架
- **Tailwind CSS** - 原子化 CSS 框架
- **Lucide React** - 美观的图标库
- **SSE (Server-Sent Events)** - 实时数据流
- **企业级架构** - 可扩展的组件和服务设计

## 项目结构

```
src/
├── components/          # 组件目录
│   ├── ui/             # 基础 UI 组件
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── ScrollArea.tsx
│   │   └── Collapsible.tsx
│   ├── sidebar/        # 侧边栏组件
│   │   ├── Sidebar.tsx
│   │   └── SessionList.tsx
│   └── chat/           # 聊天相关组件
│       ├── ChatPanel.tsx
│       ├── MessageList.tsx
│       ├── ChatInput.tsx
│       ├── ToolDisplay.tsx
│       └── FileUpload.tsx
├── hooks/              # React Hooks
│   └── useChat.ts      # 聊天功能主要逻辑
├── services/           # API 服务层
│   └── api.ts          # HTTP 和 SSE 客户端
├── types/              # TypeScript 类型定义
│   └── chat.ts         # 聊天相关类型
├── utils/              # 工具函数
│   ├── cn.ts          # 类名合并工具
│   └── format.ts      # 格式化工具
├── App.tsx            # 主应用组件
├── index.tsx          # 应用入口
└── index.css          # 全局样式
```

## 快速开始

### 1. 安装依赖

```bash
cd src/frontend
npm install
```

### 2. 配置环境变量

创建 `.env` 文件：

```bash
# API 基础 URL（可选，默认使用 proxy）
REACT_APP_API_URL=http://localhost:9000
```

### 3. 启动开发服务器

```bash
npm start
```

应用将在 http://localhost:3000 启动

### 4. 构建生产版本

```bash
npm run build
```

## 组件设计

### 架构原则

1. **单一职责**：每个组件专注于特定功能
2. **可复用性**：基础组件可在多处使用
3. **类型安全**：完整的 TypeScript 类型定义
4. **可测试性**：清晰的 Props 接口和状态管理

### 核心组件

#### `useChat` Hook
聊天功能的核心逻辑，管理：
- 会话状态和消息列表
- SSE 连接和流式更新
- 文件上传和错误处理

#### `ChatPanel`
右侧主要聊天界面，整合：
- 消息列表展示
- 输入框和发送控制
- 连接状态指示

#### `Sidebar`
左侧历史记录面板，包含：
- 会话列表展示
- 新建会话功能
- 响应式抽屉设计

#### `ToolDisplay`
工具调用展示组件，特性：
- 可折叠的调用详情
- 参数和结果展示
- 执行状态指示

## API 集成

### SSE 流式接口
```typescript
// 发起流式聊天
const sseClient = chatApiService.startStreamingChat(
  {
    user_id: 'user_1',
    query: '帮我规划北京三日游',
    session_id: 'session_123'
  },
  onMessage,   // 消息处理
  onError,     // 错误处理  
  onComplete   // 完成回调
);
```

### 事件类型
- `meta`: 会话信息
- `delta`: 文本片段
- `tool_call`: 工具调用
- `tool_result`: 工具结果
- `done`: 对话完成
- `error`: 错误信息

### 文件上传
```typescript
// 上传多个文件
const fileUrls = await chatApiService.uploadFiles(files);
```

## 样式系统

### CSS 变量
使用 CSS 变量实现主题系统：
```css
:root {
  --primary: 221.2 83.2% 53.3%;
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  /* ... */
}
```

### 响应式设计
- **移动端**：抽屉式侧边栏
- **桌面端**：固定式侧边栏
- **断点**：lg (1024px) 为分界点

### 动画效果
- 消息加载动画
- 流式输出指示器
- 工具调用状态变化
- 页面过渡效果

## 开发指南

### 添加新组件

1. 在对应目录创建组件文件
2. 定义 Props 接口和类型
3. 实现组件逻辑
4. 添加样式类名
5. 导出组件

```typescript
interface NewComponentProps {
  // 定义属性
}

export function NewComponent({ ...props }: NewComponentProps) {
  // 组件实现
}
```

### 状态管理

使用 `useChat` Hook 集中管理状态：
```typescript
const {
  state,           // 应用状态
  currentMessages, // 当前消息
  isConnected,     // 连接状态
  sendMessage,     // 发送消息
  switchSession,   // 切换会话
} = useChat(userId);
```

### 错误处理

统一的错误处理机制：
```typescript
try {
  await apiCall();
} catch (error) {
  // 更新错误状态
  updateState(prev => ({ 
    ...prev, 
    error: error.message 
  }));
}
```

## 性能优化

### 组件优化
- 使用 `React.memo` 防止不必要重渲染
- `useCallback` 和 `useMemo` 优化计算
- 虚拟滚动处理大量消息

### 网络优化
- SSE 连接复用
- 文件上传进度提示
- 请求去重和缓存

### 用户体验
- 骨架屏加载状态
- 乐观更新机制
- 离线状态处理

## 部署

### 构建优化
```bash
# 生产构建
npm run build

# 分析包大小
npm install --save-dev webpack-bundle-analyzer
npm run build && npx webpack-bundle-analyzer build/static/js/*.js
```

### 环境配置
- 开发环境：使用 proxy 代理 API
- 生产环境：配置正确的 API_URL
- CDN：静态资源 CDN 加速

## 故障排除

### 常见问题

1. **SSE 连接失败**
   - 检查后端服务是否启动
   - 确认 CORS 配置正确
   - 验证网络连接

2. **文件上传失败**
   - 检查文件大小限制
   - 确认文件类型支持
   - 验证上传接口

3. **样式异常**
   - 确认 Tailwind CSS 配置
   - 检查 CSS 变量定义
   - 验证响应式断点

### 调试技巧

```typescript
// 开启调试模式
localStorage.setItem('debug', 'true');

// 查看 SSE 事件
console.log('SSE Event:', event);

// 检查组件状态
console.log('Chat State:', state);
```

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 创建 Pull Request

### 代码规范
- 使用 TypeScript 严格模式
- 遵循 React Hooks 规则
- 保持组件单一职责
- 添加必要的注释和文档

---

MatterAI Agent Frontend - 企业级智能体前端解决方案
