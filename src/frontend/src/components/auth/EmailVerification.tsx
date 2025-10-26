import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';

interface EmailVerificationProps {
  email: string;
  purpose: 'register' | 'password_reset' | 'email_binding';
  onVerificationSuccess: (code: string) => void;
  onCancel?: () => void;
  error?: string;
  loading?: boolean;
}

const EmailVerification: React.FC<EmailVerificationProps> = ({
  email,
  purpose,
  onVerificationSuccess,
  onCancel,
  error: externalError,
  loading: externalLoading
}) => {
  const { t } = useTranslation();
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 使用外部传入的状态
  const finalLoading = loading || externalLoading;
  const finalError = externalError || error;

  // 当外部传入新错误时，清除内部成功状态
  useEffect(() => {
    if (externalError) {
      setError('');
      setSuccess('');
    }
  }, [externalError]);

  // Purpose-specific text mapping
  const getPurposeText = () => {
    switch (purpose) {
      case 'register':
        return {
          title: t('auth.verificationTitle.register', '邮箱验证 - 注册账户'),
          description: t('auth.verificationDesc.register', '请输入发送到您邮箱的6位验证码完成注册'),
          sendButton: t('auth.sendCode.register', '发送注册验证码'),
          verifyButton: t('auth.verify.register', '完成注册')
        };
      case 'password_reset':
        return {
          title: t('auth.verificationTitle.passwordReset', '邮箱验证 - 重置密码'),
          description: t('auth.verificationDesc.passwordReset', '请输入发送到您邮箱的6位验证码完成密码重置'),
          sendButton: t('auth.sendCode.passwordReset', '发送重置验证码'),
          verifyButton: t('auth.verify.passwordReset', '验证并重置')
        };
      case 'email_binding':
        return {
          title: t('auth.verificationTitle.emailBinding', '邮箱验证 - 绑定邮箱'),
          description: t('auth.verificationDesc.emailBinding', '请输入发送到新邮箱的6位验证码完成绑定'),
          sendButton: t('auth.sendCode.emailBinding', '发送绑定验证码'),
          verifyButton: t('auth.verify.emailBinding', '完成绑定')
        };
      default:
        return {
          title: t('auth.verificationTitle.default', '邮箱验证'),
          description: t('auth.verificationDesc.default', '请输入验证码'),
          sendButton: t('auth.sendCode.default', '发送验证码'),
          verifyButton: t('auth.verify.default', '验证')
        };
    }
  };

  const purposeText = getPurposeText();

  // Countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown]);

  const handleSendCode = async () => {
    setSendingCode(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.sendVerificationCode({ email, purpose });
      
      if (response.success) {
        setSuccess(response.message || t('auth.codeSentSuccess', '验证码已发送'));
        setCountdown(60); // 60 second countdown
      } else {
        setError(response.message || t('auth.codeSentFailed', '验证码发送失败'));
      }
    } catch (error: any) {
      setError(error.message || t('auth.codeSentError', '发送验证码时出错'));
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError(t('auth.codeInvalid', '请输入6位验证码'));
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    // 直接调用成功回调，让父组件处理验证
    // 这样避免了双重验证问题
    try {
      onVerificationSuccess(verificationCode);
    } catch (error: any) {
      setError(error.message || t('auth.codeVerifyError', '验证码验证时出错'));
    } finally {
      setLoading(false);
    }
  };

  const handleCodeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setVerificationCode(value);
    setError('');
  };

  // Auto-send code on mount for certain purposes
  useEffect(() => {
    if (purpose === 'password_reset' || purpose === 'email_binding') {
      handleSendCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purpose]);

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="text-center mb-6">
        <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {purposeText.title}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {purposeText.description}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
          {t('auth.emailAddress', '邮箱地址')}: <span className="font-medium">{email}</span>
        </p>
      </div>

      {/* Send Code Section */}
      {purpose === 'register' && (
        <div className="mb-6">
          <button
            onClick={handleSendCode}
            disabled={sendingCode || countdown > 0}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
          >
            {sendingCode 
              ? t('auth.sending', '发送中...')
              : countdown > 0 
                ? t('auth.resendIn', '重新发送 ({{seconds}}s)', { seconds: countdown })
                : purposeText.sendButton
            }
          </button>
        </div>
      )}

      {/* Verification Code Input */}
      <div className="mb-6">
        <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('auth.verificationCode', '验证码')}
        </label>
        <input
          id="verification-code"
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          placeholder="000000"
          value={verificationCode}
          onChange={handleCodeInputChange}
          className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          autoComplete="off"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {t('auth.codeHint', '请输入6位数字验证码')}
        </p>
      </div>

      {/* Error/Success Messages */}
      {finalError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
          <p className="text-red-600 dark:text-red-400 text-sm">{finalError}</p>
        </div>
      )}
      
      {success && (
        <div className="mb-4 space-y-2">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
            <p className="text-green-600 dark:text-green-400 text-sm">{success}</p>
          </div>
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-yellow-700 dark:text-yellow-400 text-sm">
                {t('auth.spamWarning', '提示：如果未收到邮件，请检查垃圾邮件/垃圾箱文件夹')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-3">
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex-1 py-2 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
          >
            {t('common.cancel', '取消')}
          </button>
        )}
        <button
          onClick={handleVerifyCode}
          disabled={finalLoading || verificationCode.length !== 6}
          className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
        >
          {finalLoading 
            ? t('auth.verifying', '验证中...')
            : purposeText.verifyButton
          }
        </button>
      </div>

      {/* Resend Code */}
      {(purpose === 'password_reset' || purpose === 'email_binding') && (
        <div className="mt-4 text-center">
          <button
            onClick={handleSendCode}
            disabled={sendingCode || countdown > 0}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {sendingCode 
              ? t('auth.sending', '发送中...')
              : countdown > 0 
                ? t('auth.resendIn', '重新发送 ({{seconds}}s)', { seconds: countdown })
                : t('auth.resendCode', '重新发送验证码')
            }
          </button>
        </div>
      )}
    </div>
  );
};

export default EmailVerification;