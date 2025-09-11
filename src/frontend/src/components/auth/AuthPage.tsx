import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import RegisterWithVerificationForm from './RegisterWithVerificationForm';
import ForgotPasswordForm from './ForgotPasswordForm';
import { ChangePasswordForm } from './ChangePasswordForm';
import { useAuth } from '../../contexts/AuthContext';

type AuthView = 'login' | 'register' | 'forgotPassword' | 'changePassword';

export const AuthPage: React.FC = () => {
  const { login, changePassword, isLoading, error, user, clearError } = useAuth();
  const [currentView, setCurrentView] = useState<AuthView>('login');
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);

  const handleLogin = async (email: string, password: string) => {
    try {
      await login(email, password);
    } catch (err) {
      // Error is handled by the AuthContext
    }
  };


  const handleChangePassword = async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    if (newPassword !== confirmPassword || !user) {
      return;
    }

    try {
      await changePassword(currentPassword, newPassword);
      setPasswordChangeSuccess(true);
    } catch (err) {
      // Error is handled by the AuthContext
    }
  };

  const handleViewChange = (view: AuthView) => {
    clearError();
    setPasswordChangeSuccess(false);
    setCurrentView(view);
  };

  const handleForgotPassword = () => {
    if (user) {
      setCurrentView('changePassword');
    } else {
      setCurrentView('forgotPassword');
    }
  };

  const handlePasswordChangeComplete = () => {
    setPasswordChangeSuccess(false);
    setCurrentView('login');
  };

  if (currentView === 'login') {
    return (
      <LoginForm
        onSubmit={handleLogin}
        onRegister={() => handleViewChange('register')}
        onForgotPassword={handleForgotPassword}
        isLoading={isLoading}
        error={error || undefined}
      />
    );
  }

  if (currentView === 'register') {
    return (
      <RegisterWithVerificationForm
        onSwitchToLogin={() => handleViewChange('login')}
      />
    );
  }

  if (currentView === 'forgotPassword') {
    return (
      <ForgotPasswordForm
        onBackToLogin={() => handleViewChange('login')}
      />
    );
  }

  if (currentView === 'changePassword' && user) {
    return (
      <ChangePasswordForm
        email={user.email}
        onSubmit={handleChangePassword}
        onCancel={handlePasswordChangeComplete}
        isLoading={isLoading}
        error={error || undefined}
        success={passwordChangeSuccess}
      />
    );
  }

  return null;
};