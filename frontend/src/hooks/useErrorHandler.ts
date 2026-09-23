import { useCallback } from 'react';
import toast from 'react-hot-toast';

export interface HandleErrorOptions {
  showToast?: boolean;
  toastTitle?: string;
  silent?: boolean;
}

export function useErrorHandler() {
  const handleError = useCallback((error: unknown, options: HandleErrorOptions = {}) => {
    const { showToast = true, toastTitle, silent = false } = options;

    let message = 'An unexpected error occurred.';
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      message = String((error as { message: unknown }).message);
    }

    if (!silent) {
      console.error('[LegalEase Error Handler Log]:', error);
    }

    if (showToast) {
      toast.error(toastTitle ? `${toastTitle}: ${message}` : message);
    }

    return message;
  }, []);

  return { handleError };
}
