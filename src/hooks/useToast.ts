import { useState, useCallback } from 'react';
import { ToastData, ToastVariant } from '../components/Toast';

let toastIdCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((variant: ToastVariant, message: string, duration?: number) => {
    const id = `toast-${++toastIdCounter}`;
    setToasts((prev) => [...prev, { id, variant, message, duration }]);
    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showError = useCallback((message: string, duration?: number) => {
    return addToast('error', message, duration);
  }, [addToast]);

  const showWarning = useCallback((message: string, duration?: number) => {
    return addToast('warning', message, duration);
  }, [addToast]);

  const showInfo = useCallback((message: string, duration?: number) => {
    return addToast('info', message, duration);
  }, [addToast]);

  const showSuccess = useCallback((message: string, duration?: number) => {
    return addToast('success', message, duration);
  }, [addToast]);

  return {
    toasts,
    addToast,
    dismissToast,
    showError,
    showWarning,
    showInfo,
    showSuccess,
  };
}
