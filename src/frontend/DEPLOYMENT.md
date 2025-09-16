# MatterAI Agent 前端静态部署指南

## 概述

MatterAI Agent 前端已配置为支持静态部署，可以部署到任何静态网站托管服务（如 Nginx、Apache、Netlify、Vercel 等）。

## 环境配置

### 生产环境变量 (.env.production)
```bash
REACT_APP_API_BASE_URL=http://47.99.180.80/matterai
REACT_APP_FILE_UPLOAD_URL=http://47.99.180.80/file/upload
GENERATE_SOURCEMAP=false
```

### 开发环境变量 (.env.development)
```bash
REACT_APP_API_BASE_URL=http://localhost:9000
REACT_APP_FILE_UPLOAD_URL=http://47.99.180.80/file/upload
```

## 构建命令

### 生产构建
```bash
npm run build:production
```

### 开发构建
```bash
npm run build
```

### 本地预览
```bash
npm run serve
```

### 测试所有路由
构建完成后，测试以下页面是否正常工作：
- `http://localhost:3000/` - MatterAI 主页面
- `http://localhost:3000/minds` - MINDS 智能体页面
- `http://localhost:3000/auth` - 认证页面

如果直接访问 `/minds` 显示 404，说明服务器配置有问题。

### ⚠️ 重要：不能直接打开 index.html
**不要**直接在浏览器中打开 `build/index.html` 文件，因为：
1. 资源路径是绝对路径（如 `/static/js/main.js`），直接打开会找不到文件
2. 浏览器 CORS 安全限制，`file://` 协议无法正常运行 React 应用
3. JavaScript 模块需要通过 HTTP 协议加载

**正确方法**：
```bash
# 使用内置服务器（推荐）
npm run serve

# 或使用 Python 服务器
cd build && python3 -m http.server 8080

# 或使用 Node.js 服务器
npx serve -s build -p 3000
```

## 部署步骤

### 1. 安装依赖
```bash
npm install
```

### 2. 生产构建
```bash
npm run build:production
```

### 3. 部署静态文件
将 `build/` 目录中的所有文件部署到您的静态网站服务器：

#### Nginx 配置示例
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/build;
    index index.html;

    # React Router 支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API 代理（如果需要）
    location /api/ {
        proxy_pass http://47.99.180.80/matterai/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### Apache 配置示例
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /path/to/build

    # React Router 支持
    <Directory "/path/to/build">
        Options -Indexes
        AllowOverride All
        Require all granted
    </Directory>

    # Fallback for React Router
    FallbackResource /index.html
</VirtualHost>
```

## ⚠️ 关键配置说明

### SPA 路由支持
**这是最重要的配置！** 应用有多个页面路由：
- `/` - MatterAI 主页面
- `/minds` - MINDS 智能体页面
- `/auth` - 认证页面

但只有一个 `index.html` 文件，这是 SPA (Single Page Application) 的特点。

**必须配置服务器将所有未找到的路径重定向到 `index.html`**，否则用户直接访问 `/minds` 会看到 404 错误。

### 1. 跨域问题
- 确保后端 API 服务器（http://47.99.180.80/matterai）配置了正确的 CORS 设置
- 允许您的静态网站域名访问

### 2. 路由配置
- 使用 React Router，需要配置服务器支持 SPA (Single Page Application) 路由
- 所有未找到的路径都应该返回 `index.html`

### 3. HTTPS 配置
- 如果使用 HTTPS，请确保所有 API 调用也使用 HTTPS
- 混合内容可能导致浏览器阻止请求

### 4. 环境变量
- 不同部署环境使用对应的 `.env` 文件
- 生产环境建议设置 `GENERATE_SOURCEMAP=false` 以减少构建大小

## 部署到常见平台

### Netlify
1. 连接 GitHub 仓库
2. 构建命令：`npm run build:production`
3. 发布目录：`build`
4. 环境变量：在 Netlify 控制台设置

### Vercel
1. 导入 GitHub 仓库
2. 框架：Create React App
3. 构建命令：`npm run build:production`
4. 输出目录：`build`

### GitHub Pages
```bash
npm install --save-dev gh-pages
```

添加到 package.json：
```json
{
  "homepage": "https://yourusername.github.io/repository-name",
  "scripts": {
    "predeploy": "npm run build:production",
    "deploy": "gh-pages -d build"
  }
}
```

### Docker 容器
```dockerfile
FROM nginx:alpine
COPY build/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 故障排除

### 1. API 请求失败
- 检查 CORS 配置
- 验证 API 基础 URL 是否正确
- 确认网络连通性

### 2. 路由 404 错误
- 确保服务器配置了 SPA fallback
- 检查 .htaccess 或 nginx 配置

### 3. 静态资源加载失败
- 检查资源路径是否正确
- 确认服务器权限设置

## 性能优化

### 1. 构建优化
- 已启用代码分割
- 已启用资源压缩
- 已禁用 source map（生产环境）

### 2. 缓存策略
- 静态资源设置长期缓存
- HTML 文件设置短期缓存
- 使用 CDN 加速

## 监控和日志

### 1. 错误监控
建议集成错误监控服务（如 Sentry）：
```bash
npm install @sentry/react
```

### 2. 访问日志
- 配置服务器访问日志
- 监控 API 调用频率
- 跟踪用户行为

## 安全考虑

### 1. 环境变量
- 不要在前端暴露敏感信息
- 使用 REACT_APP_ 前缀的环境变量

### 2. 内容安全策略
添加 CSP 头部：
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' http://47.99.180.80;
```

### 3. 资源完整性
- 考虑使用 Subresource Integrity (SRI)
- 定期更新依赖包