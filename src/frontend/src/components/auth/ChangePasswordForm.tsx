import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface ChangePasswordFormProps {
  email: string;
  onSubmit: (currentPassword: string, newPassword: string, confirmPassword: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string;
  success?: boolean;
}

export const ChangePasswordForm: React.FC<ChangePasswordFormProps> = ({
  email,
  onSubmit,
  onCancel,
  isLoading = false,
  error,
  success = false
}) => {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validatePasswords = () => {
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      setPasswordError(t('auth.changePassword.passwordMismatch', '两次输入的新密码不匹配'));
      return false;
    }
    if (newPassword && currentPassword && newPassword === currentPassword) {
      setPasswordError(t('auth.changePassword.samePassword', '新密码不能与当前密码相同'));
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPassword && newPassword && confirmPassword && validatePasswords()) {
      onSubmit(currentPassword, newPassword, confirmPassword);
    }
  };

  const handleNewPasswordChange = (value: string) => {
    setNewPassword(value);
    if (confirmPassword || currentPassword) {
      setTimeout(() => validatePasswords(), 100);
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (newPassword) {
      setPasswordError('');
      if (newPassword !== value) {
        setPasswordError(t('auth.changePassword.passwordMismatch', '两次输入的新密码不匹配'));
      }
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
              {t('auth.changePassword.success', '密码修改成功')}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {t('auth.changePassword.successMessage', '您的密码已成功更新')}
            </p>
            <div className="mt-6">
              <Button onClick={onCancel} className="w-full">
                {t('common.continue', '继续')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-orange-100">
            <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2m-2-2v10m6 0H9a2 2 0 01-2-2V9a2 2 0 012-2h2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v2" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {t('auth.changePassword.title', '修改密码')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('auth.changePassword.subtitle', '为账户')} {email} {t('auth.changePassword.subtitleSuffix', '修改密码')}
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                {t('auth.changePassword.currentPassword', '当前密码')}
              </label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t('auth.changePassword.currentPasswordPlaceholder', '请输入当前密码')}
                className="mt-1"
              />
            </div>
            
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                {t('auth.changePassword.newPassword', '新密码')}
              </label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => handleNewPasswordChange(e.target.value)}
                placeholder={t('auth.changePassword.newPasswordPlaceholder', '请输入新密码（至少6位）')}
                className="mt-1"
              />
              <p className="mt-1 text-xs text-gray-500">
                {t('auth.changePassword.passwordHint', '新密码长度至少6个字符')}
              </p>
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                {t('auth.changePassword.confirmPassword', '确认新密码')}
              </label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                placeholder={t('auth.changePassword.confirmPasswordPlaceholder', '请再次输入新密码')}
                className="mt-1"
              />
              {passwordError && (
                <p className="mt-1 text-xs text-red-600">{passwordError}</p>
              )}
            </div>
          </div>

          <div className="flex space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              disabled={isLoading}
            >
              {t('common.cancel', '取消')}
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading || !currentPassword || !newPassword || !confirmPassword || !!passwordError}
            >
              {isLoading 
                ? t('auth.changePassword.loading', '修改中...') 
                : t('auth.changePassword.button', '修改密码')
              }
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};