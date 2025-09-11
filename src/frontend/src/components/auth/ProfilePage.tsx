import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import EmailVerification from './EmailVerification';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  verificationEmail?: string;
  isAdmin: boolean;
  createdAt: string;
}

const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const { user: authUser, logout, updateUser } = useAuth();
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [showEmailBinding, setShowEmailBinding] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const profile = await api.getUserProfile();
      setUser(profile);
    } catch (error: any) {
      setError(error.message || t('profile.loadError', '加载用户信息失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailBindingSubmit = () => {
    if (!newEmail) {
      setError(t('profile.emailRequired', '请输入新的邮箱地址'));
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setError(t('auth.invalidEmail', '请输入有效的邮箱地址'));
      return;
    }

    if (newEmail === user?.email) {
      setError(t('profile.sameEmail', '新邮箱不能与当前邮箱相同'));
      return;
    }

    setShowEmailBinding(true);
    setError('');
  };

  const handleEmailBindingSuccess = async (verificationCode: string) => {
    try {
      await api.bindEmail({
        new_email: newEmail,
        verification_code: verificationCode
      });
      
      setSuccess(t('profile.emailBindSuccess', '邮箱绑定成功'));
      setShowEmailBinding(false);
      setNewEmail('');
      
      // Reload profile to get updated email
      await loadUserProfile();
      
      // Update auth context
      if (authUser) {
        updateUser({ ...authUser, email: newEmail });
      }
      
    } catch (error: any) {
      setError(error.message || t('profile.emailBindError', '邮箱绑定失败'));
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setError(t('auth.fillAllFields', '请填写所有字段'));
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setError(t('auth.passwordTooShort', '新密码至少需要6个字符'));
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError(t('auth.passwordMismatch', '两次输入的新密码不一致'));
      return;
    }

    try {
      await api.changePassword({
        email: user!.email,
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword
      });
      
      setSuccess(t('profile.passwordChangeSuccess', '密码修改成功'));
      setShowPasswordChange(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      
    } catch (error: any) {
      setError(error.message || t('profile.passwordChangeError', '密码修改失败'));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">{error || t('profile.userNotFound', '用户信息不存在')}</p>
        </div>
      </div>
    );
  }

  if (showEmailBinding) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('profile.bindNewEmail', '绑定新邮箱')}
          </h1>
        </div>
        
        <EmailVerification
          email={newEmail}
          purpose="email_binding"
          onVerificationSuccess={handleEmailBindingSuccess}
          onCancel={() => setShowEmailBinding(false)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {t('profile.title', '个人信息')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('profile.description', '管理您的账户信息和设置')}
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
          <p className="text-green-600 dark:text-green-400">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            {t('profile.basicInfo', '基本信息')}
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('profile.userId', '用户ID')}
              </label>
              <p className="text-gray-900 dark:text-white font-mono text-sm bg-gray-50 dark:bg-gray-700 p-2 rounded">
                {user.id}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('profile.name', '姓名')}
              </label>
              <p className="text-gray-900 dark:text-white">{user.name}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('profile.email', '邮箱地址')}
              </label>
              <div className="flex items-center space-x-2">
                <p className="text-gray-900 dark:text-white">{user.email}</p>
                {user.emailVerified ? (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 rounded-full">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {t('profile.verified', '已验证')}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 rounded-full">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {t('profile.unverified', '未验证')}
                  </span>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('profile.role', '角色')}
              </label>
              <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                user.isAdmin 
                  ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
              }`}>
                {user.isAdmin ? t('profile.admin', '管理员') : t('profile.user', '普通用户')}
              </span>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('profile.joinDate', '注册时间')}
              </label>
              <p className="text-gray-900 dark:text-white">{formatDate(user.createdAt)}</p>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="space-y-6">
          {/* Email Binding */}
          {!user.emailVerified && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {t('profile.bindEmail', '绑定邮箱')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {t('profile.bindEmailDescription', '绑定邮箱后可以使用邮箱重置密码等功能')}
              </p>
              
              <div className="space-y-4">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder={t('profile.enterNewEmail', '请输入新的邮箱地址')}
                />
                <button
                  onClick={handleEmailBindingSubmit}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  {t('profile.bindEmailButton', '绑定邮箱')}
                </button>
              </div>
            </div>
          )}

          {/* Password Change */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('profile.changePassword', '修改密码')}
            </h2>
            
            {!showPasswordChange ? (
              <div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {t('profile.changePasswordDescription', '定期更改密码可以提高账户安全性')}
                </p>
                <button
                  onClick={() => setShowPasswordChange(true)}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  {t('profile.changePasswordButton', '修改密码')}
                </button>
              </div>
            ) : (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('profile.currentPassword', '当前密码')}
                  </label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('profile.newPassword', '新密码')}
                  </label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    minLength={6}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('profile.confirmNewPassword', '确认新密码')}
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordChange(false);
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    }}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    {t('common.cancel', '取消')}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    {t('profile.updatePassword', '更新密码')}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Logout */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('profile.accountActions', '账户操作')}
            </h2>
            <button
              onClick={logout}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {t('profile.logout', '退出登录')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;