import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import EmailVerification from './EmailVerification';

interface RegisterWithVerificationFormProps {
  onSwitchToLogin: () => void;
}

const RegisterWithVerificationForm: React.FC<RegisterWithVerificationFormProps> = ({
  onSwitchToLogin
}) => {
  const { t } = useTranslation();
  const { updateUser } = useAuth();
  
  const [step, setStep] = useState<'form' | 'verification'>('form');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.name) {
      setError(t('auth.fillAllFields', '请填写所有必填字段'));
      return false;
    }
    
    if (formData.password.length < 6) {
      setError(t('auth.passwordTooShort', '密码至少需要6个字符'));
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError(t('auth.passwordMismatch', '两次输入的密码不一致'));
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError(t('auth.invalidEmail', '请输入有效的邮箱地址'));
      return false;
    }
    
    return true;
  };

  const handleSendVerificationCode = () => {
    if (!validateForm()) return;
    
    setStep('verification');
    setError('');
  };

  const handleVerificationSuccess = async (verificationCode: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await api.registerWithVerification({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        verification_code: verificationCode
      });

      // Auto login after successful registration
      updateUser({
        id: response.id,
        email: response.email,
        name: response.name,
        isAdmin: response.isAdmin,
        emailVerified: response.emailVerified,
        token: response.token
      });
      
    } catch (error: any) {
      // 如果是验证码相关错误，回到验证步骤让用户重新输入
      const errorMessage = error.message || t('auth.registrationFailed', '注册失败，请重试');
      setError(errorMessage);
      
      // 保持在验证步骤，让用户可以重新输入验证码
      if (errorMessage.includes('验证码')) {
        // 验证码错误，保持在验证页面
        setStep('verification');
      } else {
        // 其他错误，回到表单页面
        setStep('form');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackToForm = () => {
    setStep('form');
    setError('');
  };

  if (step === 'verification') {
    return (
      <EmailVerification
        email={formData.email}
        purpose="register"
        onVerificationSuccess={handleVerificationSuccess}
        onCancel={handleBackToForm}
        error={error}
        loading={loading}
      />
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {t('auth.register.title', '创建新账户')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('auth.register.subtitle', '注册 MatterAI Agent 账户，需要邮箱验证')}
        </p>
      </div>

      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSendVerificationCode(); }}>
        {/* Name Field */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('auth.name', '姓名')} <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder={t('auth.enterName', '请输入姓名')}
            required
          />
        </div>

        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('auth.email', '邮箱地址')} <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder={t('auth.enterEmail', '请输入邮箱地址')}
            required
          />
        </div>

        {/* Password Field */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('auth.password', '密码')} <span className="text-red-500">*</span>
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder={t('auth.enterPassword', '请输入密码')}
            minLength={6}
            required
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('auth.passwordRequirement', '密码至少需要6个字符')}
          </p>
        </div>

        {/* Confirm Password Field */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('auth.confirmPassword', '确认密码')} <span className="text-red-500">*</span>
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder={t('auth.confirmPasswordPlaceholder', '请再次输入密码')}
            required
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {loading 
            ? t('auth.processing', '处理中...')
            : t('auth.nextStep', '下一步：邮箱验证')
          }
        </button>

        {/* Switch to Login */}
        <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('auth.alreadyHaveAccount', '已有账户？')}{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              {t('auth.loginNow', '立即登录')}
            </button>
          </p>
        </div>
      </form>

      {/* Email Verification Notice */}
      <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
              {t('auth.emailVerificationNotice', '邮箱验证说明')}
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              {t('auth.emailVerificationDescription', '点击"下一步"后，系统将向您的邮箱发送6位验证码，请查收邮件并完成验证。')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterWithVerificationForm;