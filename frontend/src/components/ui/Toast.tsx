'use client';

import { useEffect, useState, useCallback } from 'react';
import Icon from './Icon';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  onClose: () => void;
}

const toastConfig: Record<ToastType, { bg: string; outline: string; icon: string; iconClass: string }> = {
  success: {
    bg: 'bg-bg-success-light',
    outline: 'outline-green-200',
    icon: 'check_circle',
    iconClass: 'text-icon-success-primary',
  },
  error: {
    bg: 'bg-bg-error-light',
    outline: 'outline-stroke-error-secondary',
    icon: 'error',
    iconClass: 'text-icon-error-primary',
  },
  warning: {
    bg: 'bg-bg-warning-light',
    outline: 'outline-stroke-warning-secondary',
    icon: 'warning',
    iconClass: 'text-icon-warning-primary',
  },
  info: {
    bg: 'bg-bg-info-secondary-light',
    outline: 'outline-stroke-info-secondary',
    icon: 'info',
    iconClass: 'text-icon-info-primary',
  },
};

function Toast({ type, title, description, duration = 4000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
    const timer = setTimeout(handleClose, duration);
    return () => clearTimeout(timer);
  }, [duration, handleClose]);

  const config = toastConfig[type];

  return (
    <div
      className={`w-96 px-2 py-3 ${config.bg} rounded-lg outline outline-2 outline-offset-[-2px] ${config.outline} inline-flex justify-start items-center gap-2 transition-all duration-200 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
    >
      <div className="px-2 py-1 rounded-full flex justify-start items-center">
        <Icon name={config.icon} size={24} className={config.iconClass} />
      </div>
      <div className="flex-1 inline-flex flex-col justify-start items-start gap-0.5">
        <span className="self-stretch text-text-primary text-sm font-normal leading-4">
          {title}
        </span>
        {description && (
          <span className="self-stretch text-text-tertiary text-xs font-normal leading-4">
            {description}
          </span>
        )}
      </div>
      <button
        onClick={handleClose}
        className="p-2 rounded-lg flex justify-center items-center"
      >
        <Icon name="close" size={16} variant="outlined" className="text-icon-tertiary" />
      </button>
    </div>
  );
}

export default Toast;
export type { ToastProps, ToastType };
