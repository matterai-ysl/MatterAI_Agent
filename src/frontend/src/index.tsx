/**
 * 应用入口文件
 * 渲染主应用组件到 DOM，支持多智能体路由
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import './i18n'; // 初始化 i18n
import NewApp from './NewApp';
import { MindsApp } from './components/minds/MindsApp';
import { MatNexusApp } from './components/matnexus/MatNexusApp';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AuthPage } from './components/auth/AuthPage';

// 获取根元素
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// 渲染应用
root.render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter basename="/agent">
        <Routes>
          {/* 认证路由 */}
          <Route 
            path="/auth" 
            element={
              <ProtectedRoute requireAuth={false}>
                <AuthPage />
              </ProtectedRoute>
            } 
          />
          
          {/* 默认路由 - 通用智能体 (需要认证) */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <NewApp />
              </ProtectedRoute>
            } 
          />
          
          {/* MINDS 智能体路由 (需要认证) */}
          <Route
            path="/minds"
            element={
              <ProtectedRoute>
                <MindsApp />
              </ProtectedRoute>
            }
          />

          {/* MatNexus 智能体路由 (需要认证) */}
          <Route
            path="/matnexus"
            element={
              <ProtectedRoute>
                <MatNexusApp />
              </ProtectedRoute>
            }
          />

          {/* 未匹配的路由重定向到首页 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
