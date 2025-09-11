# 邮件服务故障排除指南

## 问题描述
邮件验证码发送失败，出现 "Unexpected EOF received" 错误。

## 可能原因与解决方案

### 1. 应用密码问题
**症状**: 所有SMTP连接方法都失败
**解决方案**:
- 检查QQ邮箱应用密码是否正确
- 重新生成QQ邮箱应用密码:
  1. 登录QQ邮箱 → 设置 → 账户
  2. POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务 → 生成授权码
  3. 将新的授权码更新到 `.env` 文件中的 `SMTP_PASSWORD`

### 2. 网络环境限制
**症状**: "Connection refused" 或 "Unexpected EOF received"
**解决方案**:
- **选项A**: 更换为阿里云企业邮箱
  ```bash
  SMTP_HOST=smtp.mxhichina.com
  SMTP_PORT=465
  ```
- **选项B**: 使用163邮箱
  ```bash
  SMTP_HOST=smtp.163.com
  SMTP_PORT=465
  ```
- **选项C**: 联系阿里云客服开放SMTP端口(25/465/587)

### 3. QQ邮箱安全设置
**解决方案**:
1. 确保已开启SMTP服务
2. 使用应用密码而不是登录密码
3. 检查是否有IP限制

### 4. 防火墙/安全组设置
**解决方案**:
- 检查阿里云安全组是否开放了SMTP端口
- 端口: 25, 465, 587

## 临时解决方案

### 使用模拟邮件服务（开发测试用）
如果暂时无法解决SMTP问题，可以启用模拟模式：

在 `.env` 文件中添加：
```bash
EMAIL_MOCK_MODE=true
```

这将在控制台输出验证码而不发送真实邮件。

### 快速切换到163邮箱
更新 `.env` 文件：
```bash
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_USERNAME=your_163_email@163.com
SMTP_PASSWORD=your_163_app_password
FROM_EMAIL=your_163_email@163.com
```

## 测试步骤

1. **重新生成QQ邮箱应用密码**
2. **更新 `.env` 配置**
3. **运行测试**: `python test_email.py`
4. **如果仍然失败，尝试163邮箱或模拟模式**

## 推荐长期解决方案

1. **使用企业邮箱服务** (如阿里云企业邮箱、腾讯企业邮箱)
2. **使用第三方邮件服务** (如SendGrid、阿里云邮件推送)
3. **配置专用的邮件服务器**

这些方案的稳定性和送达率都比个人邮箱更好。