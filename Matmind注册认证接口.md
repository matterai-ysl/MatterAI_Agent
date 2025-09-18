认证接口API文档

  基本信息

  - 基础URL: /auth
  - 认证方式: JWT Bearer Token
  - Token有效期: 7天

 baseurl = http://47.99.180.80/agent/api
  1. 用户注册

  基础注册

  POST /auth/register

  {
    "email": "user@example.com",
    "password": "password123",
    "name": "用户名" // 可选，默认使用邮箱前缀
  }

  响应:
  {
    "id": "10001",
    "email": "user@example.com",
    "name": "用户名",
    "token": "jwt_token_here",
    "isAdmin": false
  }

  邮箱验证注册

  POST /auth/register-with-verification

  {
    "email": "user@example.com",
    "password": "password123",
    "verification_code": "123456",
    "name": "用户名" // 可选
  }

  2. 用户登录

  POST /auth/login

  {
    "email": "user@example.com",
    "password": "password123"
  }

  响应:
  {
    "id": "10001",
    "email": "user@example.com",
    "name": "用户名",
    "token": "jwt_token_here",
    "isAdmin": false
  }

  3. 密码管理

  修改密码（需要登录）

  POST /auth/change-password

  请求头: Authorization: Bearer {token}

  {
    "email": "user@example.com",
    "current_password": "old_password",
    "new_password": "new_password123"
  }

  重置密码（邮箱验证）

  POST /auth/reset-password

  {
    "email": "user@example.com",
    "new_password": "new_password123",
    "verification_code": "123456"
  }

  4. 邮箱验证码

  发送验证码

  POST /auth/send-verification-code

  {
    "email": "user@example.com",
    "purpose": "register" // register | password_reset | email_binding
  }

  响应:
  {
    "success": true,
    "message": "验证码已发送",
    "expires_in": 300
  }

  验证验证码

  POST /auth/verify-code

  {
    "email": "user@example.com",
    "code": "123456",
    "purpose": "register"
  }

  响应:
  {
    "success": true,
    "message": "验证码正确"
  }

  5. 用户信息

  获取当前用户信息

  GET /auth/me

  请求头: Authorization: Bearer {token}

  响应:
  {
    "id": "10001",
    "name": "用户名",
    "email": "user@example.com",
    "isAdmin": false,
    "emailVerified": true,
    "verificationEmail": null,
    "createdAt": "2023-12-01T10:30:00.123456+00:00"
  }

  Token验证

  POST /auth/verify

  {
    "token": "jwt_token_here"
  }

  响应:
  {
    "user_id": "user@example.com",
    "status": "verified"
  }

  6. 邮箱绑定（需要登录）

  POST /auth/bind-email

  请求头: Authorization: Bearer {token}

  {
    "new_email": "new@example.com",
    "verification_code": "123456"
  }

  错误响应格式

  {
    "detail": "错误信息"
  }

  常见错误码

  - 400: 请求参数错误
  - 401: 未授权/Token无效
  - 403: 禁止访问
  - 404: 用户不存在
  - 500: 服务器内部错误

  前端使用示例

  // 注册
  const register = async (email, password, name) => {
    const response = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });
    return response.json();
  };

  // 登录
  const login = async (email, password) => {
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return response.json();
  };

  // 发送验证码
  const sendCode = async (email, purpose) => {
    const response = await fetch('/auth/send-verification-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, purpose })
    });
    return response.json();
  };

  // 带Token的请求
  const getProfile = async (token) => {
    const response = await fetch('/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  };