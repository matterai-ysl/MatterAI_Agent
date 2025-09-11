import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import EmailVerification from './EmailVerification';

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onBackToLogin
}) => {
  const { t } = useTranslation();
  
  const [step, setStep] = useState<'email' | 'verification' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError(t('auth.emailRequired', '请输入邮箱地址'));
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t('auth.invalidEmail', '请输入有效的邮箱地址'));
      return;
    }

    setStep('verification');
    setError('');
  };

  const handleVerificationSuccess = async (verificationCode: string) => {
    if (!newPassword || !confirmPassword) {
      setError(t('auth.passwordRequired', '请设置新密码'));
      return;
    }
    
    if (newPassword.length < 6) {
      setError(t('auth.passwordTooShort', '密码至少需要6个字符'));
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordMismatch', '两次输入的密码不一致'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.resetPassword({
        email,
        new_password: newPassword,
        verification_code: verificationCode
      });

      setStep('success');
      
    } catch (error: any) {
      setError(error.message || t('auth.resetPasswordFailed', '密码重置失败，请重试'));
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setError('');
  };

  if (step === 'success') {
    return (
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {t('auth.resetSuccess', '密码重置成功')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('auth.resetSuccessMessage', '您的密码已成功重置，请使用新密码登录。')}
          </p>
          <button
            onClick={onBackToLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {t('auth.backToLogin', '返回登录')}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'verification') {
    return (
      <div className="space-y-6">
        {/* New Password Form */}
        <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('auth.setNewPassword', '设置新密码')}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('auth.newPassword', '新密码')}
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder={t('auth.enterNewPassword', '请输入新密码')}
                minLength={6}
              />
            </div>
            
            <div>
              <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('auth.confirmNewPassword', '确认新密码')}
              </label>
              <input
                id="confirmNewPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder={t('auth.confirmNewPasswordPlaceholder', '请再次输入新密码')}
              />
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Email Verification */}
        <EmailVerification
          email={email}
          purpose="password_reset"
          onVerificationSuccess={handleVerificationSuccess}
          onCancel={handleBackToEmail}
        />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="text-center mb-6">
        <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2m0 0a2 2 0 012-2" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {t('auth.forgotPassword', '忘记密码')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('auth.forgotPasswordDescription', '请输入您的邮箱地址，我们将发送验证码以重置密码')}
        </p>
      </div>

      <form onSubmit={handleEmailSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('auth.email', '邮箱地址')}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder={t('auth.enterEmail', '请输入邮箱地址')}
            required
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {loading 
            ? t('auth.processing', '处理中...')
            : t('auth.sendResetCode', '发送重置验证码')
          }
        </button>

        <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onBackToLogin}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
          >
            {t('auth.backToLogin', '返回登录')}
          </button>
        </div>
      </form>

      {/* Reset Instructions */}
      <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
              {t('auth.resetInstructions', '密码重置说明')}
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              {t('auth.resetInstructionsText', '只有经过邮箱验证的账户才能通过邮箱重置密码。如果您的账户尚未验证邮箱，请联系管理员协助重置。')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;