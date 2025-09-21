# SSO测试指南

## 🚀 测试准备

### 1. 启动后端服务
```bash
cd /Users/ysl/Desktop/Code/MatterAI_Agent/src/backend
python main.py
```

### 2. 启动前端服务
```bash
cd /Users/ysl/Desktop/Code/MatterAI_Agent/src/frontend
npm start
```

## 📋 测试步骤

### 方法1: 使用测试页面

1. **访问测试页面**
   ```
   本地开发: http://localhost:3000/agent/sso_test.html
   生产环境: http://47.99.180.80/agent/sso_test.html
   ```

2. **获取有效的JWT Token**
   - 在正常登录页面登录一个用户
   - 从localStorage或开发者工具获取token
   - 或者通过API直接登录获取

3. **测试SSO流程**
   - 将token粘贴到测试页面
   - 点击"测试SSO跳转"
   - 观察浏览器和后端控制台的日志

### 方法2: 手动URL测试

直接访问以下URL格式：
```
本地开发: http://localhost:9000/auth/sso?token=YOUR_JWT_TOKEN&redirect_to=/
生产环境: http://47.99.180.80/agent/api/auth/sso?token=YOUR_JWT_TOKEN&redirect_to=/
```

### 方法3: 模拟A网站跳转

```javascript
// 在浏览器控制台执行
const token = localStorage.getItem('token'); // 获取当前用户token

// 根据环境选择URL
const backendUrl = window.location.hostname === 'localhost'
  ? 'http://localhost:9000'
  : 'http://47.99.180.80/agent/api';

const ssoUrl = `${backendUrl}/auth/sso?token=${encodeURIComponent(token)}&redirect_to=/`;
window.open(ssoUrl, '_blank');
```

## 🔍 调试信息位置

### 后端日志
运行后端的终端会显示详细的SSO处理日志：
```
============================================================
🚀 SSO LOGIN STARTED
📥 接收到参数:
   token (前20字符): eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
   redirect_to: /
   token长度: 205
🔍 开始验证token...
...
```

### 前端日志
浏览器开发者工具控制台会显示详细的前端处理日志：
```
==================================================
🌐 NewApp: 检查URL参数...
📥 当前URL参数: {sso_token: "...", sso: "true"}
...
```

## 🧪 测试场景

### 场景1: 正常SSO流程
1. 使用有效的、未过期的JWT token
2. 期望结果: 成功登录并跳转到首页

### 场景2: 无效Token
1. 使用错误的或格式不正确的token
2. 期望结果: 重定向到 `/auth?error=invalid_token`

### 场景3: 过期Token
1. 使用已过期的JWT token
2. 期望结果: 重定向到 `/auth?error=token_expired`

### 场景4: 用户不存在
1. 使用有效但对应用户不在数据库中的token
2. 期望结果: 重定向到 `/auth?error=user_not_found`

## 🔧 常见问题排查

### 问题1: 后端没有收到SSO请求
- 检查URL是否正确
- 确认后端服务运行在正确端口(9000)
- 检查网络连接

### 问题2: Token验证失败
- 确认SECRET_KEY配置一致
- 检查token是否完整和正确
- 验证token是否过期

### 问题3: 前端没有处理SSO参数
- 检查浏览器控制台是否有错误
- 确认URL参数格式正确
- 验证NewApp.tsx中的useEffect是否执行

### 问题4: 用户状态没有更新
- 检查AuthContext是否正确调用
- 确认localStorage是否保存token
- 验证用户状态是否正确更新

## 📊 预期的调试输出

### 成功的SSO流程应该看到：

**后端:**
```
============================================================
🚀 SSO LOGIN STARTED
✅ Token解码成功!
✅ 用户验证成功!
✅ 新token生成成功!
✅ SSO LOGIN SUCCESSFUL - 即将重定向
============================================================
==================================================
🔍 SSO TOKEN VERIFICATION STARTED
✅ SSO Token解码成功!
✅ 用户查询成功!
✅ SSO验证成功!
==================================================
```

**前端:**
```
🌐 NewApp: 检查URL参数...
✅ 检测到SSO登录参数，开始处理...
==================================================
🚀 AuthContext: SSO登录开始
✅ API验证成功!
✅ SSO登录完成!
==================================================
✅ SSO登录流程完全完成!
```

## 🎯 测试成功标志

1. 后端日志显示"SSO LOGIN SUCCESSFUL"
2. 前端日志显示"SSO登录流程完全完成"
3. 用户成功登录并看到主页面
4. URL参数被清理（不再包含sso_token）
5. localStorage中保存了新的token和用户信息

如果以上步骤都成功，说明SSO功能正常工作！