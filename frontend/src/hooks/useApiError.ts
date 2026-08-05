import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export function useApiError() {
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback((err: unknown, fallbackMessage = 'An error occurred') => {
    const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
    const message = errorObj?.response?.data?.message || errorObj?.message || fallbackMessage;
    setError(message);
    toast.error(message);
    return message;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleError,
    clearError,
  };
}
