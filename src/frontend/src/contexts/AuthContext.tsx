import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { API_BASE_URL, api } from '../services/api';

export interface User {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  emailVerified?: boolean;
  token: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User }
  | { type: 'CLEAR_USER' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' };

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  clearError: () => void;
  updateUser: (user: User) => void;
  // SSO 相关方法
  handleSSOLogin: (ssoToken: string) => Promise<void>;
  generateSSOUrl: (targetSiteUrl: string, redirectPath?: string) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'CLEAR_USER':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for stored token on app start
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        dispatch({ type: 'SET_USER', payload: { ...user, token: storedToken } });
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    const apiBaseUrl = API_BASE_URL || process.env.REACT_APP_API_BASE_URL || '';
    const loginUrl = `${apiBaseUrl.replace(/\/$/, '')}/auth/login`;

    console.log('🔐 开始登录流程...');
    console.log('📧 邮箱:', email);
    console.log('🌐 API Base URL:', apiBaseUrl);
    console.log('🎯 登录URL:', loginUrl);

    try {
      console.log('📤 发送登录请求...');
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('📥 收到响应:', response.status, response.statusText);

      const data = await response.json();
      console.log('📋 响应数据:', data);

      if (!response.ok) {
        console.error('❌ 登录失败:', data.detail || 'Login failed');
        throw new Error(data.detail || 'Login failed');
      }

      const user: User = {
        id: data.id,
        email: data.email,
        name: data.name,
        isAdmin: data.isAdmin,
        emailVerified: data.emailVerified || false,
        token: data.token,
      };

      console.log('👤 用户信息:', { id: user.id, email: user.email, name: user.name });

      // Store token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
      }));

      console.log('✅ 登录成功，数据已保存到本地存储');
      dispatch({ type: 'SET_USER', payload: user });

      // 检查是否需要跳转回之前的页面
      const redirectPath = localStorage.getItem('redirectAfterLogin');
      if (redirectPath) {
        console.log('🔄 检测到登录前路径，准备跳转:', redirectPath);
        localStorage.removeItem('redirectAfterLogin');
        // 延迟一下让状态更新完成
        setTimeout(() => {
          window.location.href = redirectPath;
        }, 100);
      }
    } catch (error) {
      console.error('🚨 登录过程发生错误:', error);
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Login failed' });
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    const apiBaseUrl = API_BASE_URL || process.env.REACT_APP_API_BASE_URL || '';
    const registerUrl = `${apiBaseUrl.replace(/\/$/, '')}/auth/register`;

    console.log('📝 开始注册流程...');
    console.log('👤 用户名:', name);
    console.log('📧 邮箱:', email);
    console.log('🎯 注册URL:', registerUrl);

    try {
      const response = await fetch(registerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Registration failed');
      }

      const user: User = {
        id: data.id,
        email: data.email,
        name: data.name,
        isAdmin: data.isAdmin,
        emailVerified: data.emailVerified || false,
        token: data.token,
      };

      // Store token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
      }));

      dispatch({ type: 'SET_USER', payload: user });

      // 检查是否需要跳转回之前的页面
      const redirectPath = localStorage.getItem('redirectAfterLogin');
      if (redirectPath) {
        console.log('🔄 检测到登录前路径，准备跳转:', redirectPath);
        localStorage.removeItem('redirectAfterLogin');
        setTimeout(() => {
          window.location.href = redirectPath;
        }, 100);
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Registration failed' });
      throw error;
    }
  };

  const logout = (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    dispatch({ type: 'CLEAR_USER' });
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    if (!state.user) {
      throw new Error('User not authenticated');
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    const apiBaseUrl = API_BASE_URL || process.env.REACT_APP_API_BASE_URL || '';
    const changePasswordUrl = `${apiBaseUrl.replace(/\/$/, '')}/auth/change-password`;

    console.log('🔑 开始更改密码流程...');
    console.log('🎯 更改密码URL:', changePasswordUrl);

    try {
      const response = await fetch(changePasswordUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.user.token}`,
        },
        body: JSON.stringify({
          email: state.user.email,
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Password change failed');
      }

      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Password change failed' });
      throw error;
    }
  };

  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const updateUser = (user: User): void => {
    dispatch({ type: 'SET_USER', payload: user });
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', user.token);
  };

  // SSO 相关方法
  const handleSSOLogin = async (ssoToken: string): Promise<void> => {
    console.log('='.repeat(50));
    console.log('🚀 AuthContext: SSO登录开始');
    console.log('📥 接收到SSO token:', ssoToken.substring(0, 20) + '...');
    console.log('📏 Token长度:', ssoToken.length);

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      console.log('🔍 调用API验证SSO token...');

      // 验证SSO token并获取用户信息
      const response = await api.verifySSOToken(ssoToken);

      console.log('✅ API验证成功!');
      console.log('📄 响应数据:', response);

      const user: User = {
        id: response.id,
        email: response.email,
        name: response.name,
        isAdmin: response.isAdmin,
        emailVerified: response.emailVerified,
        token: response.token,
      };

      console.log('👤 创建用户对象:', user);

      // 更新用户状态
      console.log('💾 更新用户状态到localStorage和context...');
      updateUser(user);

      console.log('✅ SSO登录完成!');
      console.log('🎯 当前用户状态:', {
        isAuthenticated: true,
        user: { email: user.email, name: user.name }
      });
      console.log('='.repeat(50));

      // 检查是否需要跳转回之前的页面
      const redirectPath = localStorage.getItem('redirectAfterLogin');
      if (redirectPath) {
        console.log('🔄 检测到登录前路径，准备跳转:', redirectPath);
        localStorage.removeItem('redirectAfterLogin');
        setTimeout(() => {
          window.location.href = redirectPath;
        }, 100);
      }
    } catch (error: any) {
      console.error('❌ SSO登录失败:');
      console.error('   错误对象:', error);
      console.error('   错误消息:', error.message);
      console.error('   响应数据:', error.response?.data);
      console.error('   状态码:', error.response?.status);

      const errorMessage = error.response?.data?.detail || error.message || 'SSO登录失败';
      console.error('   最终错误消息:', errorMessage);

      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      console.log('='.repeat(50));
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      console.log('🏁 SSO登录流程结束 (loading = false)');
    }
  };

  const generateSSOUrl = (targetSiteUrl: string, redirectPath: string = '/'): string => {
    try {
      return api.generateSSOUrl(targetSiteUrl, redirectPath);
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    changePassword,
    updateUser,
    clearError,
    // SSO 方法
    handleSSOLogin,
    generateSSOUrl,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};