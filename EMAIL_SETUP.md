# 邮箱验证系统配置指南

## 概述
MatterAI Agent 现在支持完整的邮箱验证功能，包括：
- 注册时邮箱验证
- 重置密码邮箱验证  
- 老用户邮箱绑定功能

## 环境变量配置

在 `.env` 文件中添加以下邮件服务器配置：

```bash
# 邮件服务器配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com
FROM_NAME=MatterAI Agent

# 现有数据库配置（必须）
DB_HOST=your-db-host
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password
```

## 邮件服务器配置说明

### Gmail 配置
1. **启用二步验证**：在 Google 账户中启用二步验证
2. **生成应用专用密码**：
   - 访问 https://myaccount.google.com/apppasswords
   - 生成"邮件"应用的专用密码
   - 将生成的密码用作 `SMTP_PASSWORD`

### 其他邮件服务商
- **QQ邮箱**: `smtp.qq.com:587`
- **163邮箱**: `smtp.163.com:465`  
- **Outlook**: `smtp.live.com:587`

## 新增API端点

### 邮箱验证相关
- `POST /auth/send-verification-code` - 发送验证码
- `POST /auth/verify-code` - 验证验证码
- `POST /auth/register-with-verification` - 邮箱验证注册
- `POST /auth/reset-password` - 邮箱验证重置密码
- `POST /auth/bind-email` - 绑定邮箱
- `GET /auth/me` - 获取完整用户信息（包含邮箱验证状态）

## 数据库变更

用户表新增字段：
```sql
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN verification_email VARCHAR(255);

-- 将现有用户标记为已验证（向后兼容）
UPDATE users SET email_verified = TRUE WHERE email_verified IS NULL;
```

## 功能特性

### 1. 注册邮箱验证
- 用户填写注册信息
- 系统发送6位数字验证码到邮箱
- 验证成功后自动创建账户并登录
- 验证码10分钟有效期，最多尝试3次

### 2. 密码重置
- 支持已验证邮箱的用户通过邮箱重置密码
- 发送验证码到已验证的邮箱
- 验证成功后设置新密码

### 3. 邮箱绑定
- 老用户（邮箱未验证）可以绑定新邮箱
- 发送验证码到新邮箱进行验证
- 验证成功后更新用户邮箱并标记为已验证

### 4. 安全特性
- 验证码内存存储（生产环境建议使用 Redis）
- 邮件内容采用专业的HTML模板
- 自动清理过期验证码（每5分钟）
- 防止暴力破解（最多尝试3次）

## 前端组件

### 新增组件
- `EmailVerification.tsx` - 通用邮箱验证组件
- `RegisterWithVerificationForm.tsx` - 邮箱验证注册表单
- `ForgotPasswordForm.tsx` - 忘记密码表单
- `ProfilePage.tsx` - 用户个人信息页面

### 更新组件
- `AuthPage.tsx` - 支持新的验证视图
- `LoginForm.tsx` - 添加邮箱验证注册入口
- `AuthContext.tsx` - 支持邮箱验证状态

## 国际化支持

已添加完整的中英文翻译支持：
- 邮箱验证相关所有文本
- 用户个人信息页面文本
- 错误提示和成功消息

## 测试建议

1. **邮件发送测试**
   ```bash
   # 启动后端服务
   cd src/backend
   python main.py
   ```

2. **前端测试**
   ```bash
   # 启动前端服务
   cd src/frontend
   npm start
   ```

3. **测试流程**
   - 测试邮箱验证注册
   - 测试忘记密码功能
   - 测试老用户邮箱绑定
   - 测试验证码过期和重试机制

## 生产环境建议

1. **使用 Redis 存储验证码**（而非内存）
2. **配置专业的邮件服务**（如 SendGrid, Amazon SES）
3. **添加邮件发送频率限制**
4. **监控邮件发送状态**
5. **备份验证码存储**

## 故障排除

### 邮件发送失败
1. 检查 SMTP 配置是否正确
2. 确认网络连接和防火墙设置
3. 验证邮箱服务商的安全设置

### 验证码问题
1. 检查邮件是否进入垃圾邮件文件夹
2. 确认验证码在有效期内（10分钟）
3. 检查是否超过最大尝试次数（3次）

### 数据库问题
1. 确认数据库连接配置正确
2. 检查新字段是否正确添加
3. 验证用户权限设置