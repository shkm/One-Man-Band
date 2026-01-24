import { useEffect, useState, useRef } from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle, X, Copy, Check } from 'lucide-react';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';

export type ToastVariant = 'error' | 'warning' | 'info' | 'success';

export interface ToastData {
  id: string;
  variant: ToastVariant;
  message: string;
  duration?: number;
}

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

const variantStyles: Record<ToastVariant, { bg: string; bgHover: string; border: string; text: string; icon: string }> = {
  error: {
    bg: 'bg-red-950/95',
    bgHover: 'hover:bg-red-900/95',
    border: 'border-red-800',
    text: 'text-red-200',
    icon: 'text-red-400',
  },
  warning: {
    bg: 'bg-yellow-950/95',
    bgHover: 'hover:bg-yellow-900/95',
    border: 'border-yellow-800',
    text: 'text-yellow-200',
    icon: 'text-yellow-400',
  },
  info: {
    bg: 'bg-blue-950/95',
    bgHover: 'hover:bg-blue-900/95',
    border: 'border-blue-800',
    text: 'text-blue-200',
    icon: 'text-blue-400',
  },
  success: {
    bg: 'bg-green-950/95',
    bgHover: 'hover:bg-green-900/95',
    border: 'border-green-800',
    text: 'text-green-200',
    icon: 'text-green-400',
  },
};

const variantIcons: Record<ToastVariant, typeof AlertTriangle> = {
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle,
};

function Toast({ toast, onDismiss }: ToastProps) {
  const styles = variantStyles[toast.variant];
  const Icon = variantIcons[toast.variant];
  const duration = toast.duration ?? 5000;
  const [copied, setCopied] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startDismissTimer = () => {
    if (duration > 0 && !isHovered) {
      timerRef.current = setTimeout(() => handleDismiss(), duration);
    }
  };

  const clearDismissTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), 200);
  };

  useEffect(() => {
    startDismissTimer();
    return () => clearDismissTimer();
  }, []);

  useEffect(() => {
    if (isHovered) {
      clearDismissTimer();
    } else {
      startDismissTimer();
    }
  }, [isHovered]);

  const handleCopy = async () => {
    await writeText(toast.message);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className={`${styles.bg} ${styles.bgHover} border ${styles.border} rounded-lg px-3 py-2 shadow-lg backdrop-blur-sm transition-all duration-200 ${
        isExiting ? 'toast-exit' : 'toast-enter'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`flex items-start gap-2 ${styles.text} text-sm`}>
        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${styles.icon}`} />
        <div className="flex-1 min-w-0 pr-1">{toast.message}</div>
        <button
          onClick={handleCopy}
          className={`${styles.icon} hover:${styles.text} transition-colors flex-shrink-0`}
          title="Copy to clipboard"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
        <button
          onClick={handleDismiss}
          className={`${styles.icon} hover:${styles.text} transition-colors flex-shrink-0`}
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
