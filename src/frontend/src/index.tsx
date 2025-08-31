/**
 * 应用入口文件
 * 渲染主应用组件到 DOM
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import NewApp from './NewApp';

// 获取根元素
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// 渲染应用
root.render(
  <React.StrictMode>
    <NewApp />
  </React.StrictMode>
);
