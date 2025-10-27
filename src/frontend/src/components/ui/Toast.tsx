import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

export interface ToastProps {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  onClose?: () => void;
}

const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 3000,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getColorClasses = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-800 dark:text-green-300';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-800 dark:text-red-300';
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-300';
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div className={`flex items-center gap-3 px-4 py-3 border rounded-lg shadow-lg ${getColorClasses()} min-w-[300px] max-w-md`}>
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <p className="text-sm font-medium flex-1">{message}</p>
        <button
          onClick={() => {
            setIsVisible(false);
            onClose?.();
          }}
          className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>,
    document.body
  );
};

// Toast 管理器
class ToastManager {
  private static instance: ToastManager;
  private toasts: Array<{ id: string; component: React.ReactElement }> = [];
  private container: HTMLDivElement | null = null;

  private constructor() {
    this.container = document.createElement('div');
    this.container.id = 'toast-container';
    document.body.appendChild(this.container);
  }

  static getInstance(): ToastManager {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager();
    }
    return ToastManager.instance;
  }

  show(props: ToastProps): void {
    const id = Math.random().toString(36).substr(2, 9);
    const toast = (
      <Toast
        key={id}
        {...props}
        onClose={() => {
          this.remove(id);
          props.onClose?.();
        }}
      />
    );
    this.toasts.push({ id, component: toast });
    this.render();
  }

  remove(id: string): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.render();
  }

  private render(): void {
    if (this.container) {
      ReactDOM.render(
        <>
          {this.toasts.map(t => t.component)}
        </>,
        this.container
      );
    }
  }
}

// 导出便捷方法
export const toast = {
  info: (message: string, duration?: number) => {
    ToastManager.getInstance().show({ message, type: 'info', duration });
  },
  success: (message: string, duration?: number) => {
    ToastManager.getInstance().show({ message, type: 'success', duration });
  },
  warning: (message: string, duration?: number) => {
    ToastManager.getInstance().show({ message, type: 'warning', duration });
  },
  error: (message: string, duration?: number) => {
    ToastManager.getInstance().show({ message, type: 'error', duration });
  },
};

export default Toast;
