import React from 'react';
import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from './Button';

export interface ApiErrorFallbackProps {
  error?: Error | unknown;
  retry?: () => void;
  title?: string;
  description?: string;
  className?: string;
}

export const ApiErrorFallback: React.FC<ApiErrorFallbackProps> = ({
  error,
  retry,
  title = 'Failed to load data',
  description,
  className = '',
}) => {
  const errorMessage =
    description ||
    (error instanceof Error ? error.message : typeof error === 'string' ? error : 'Network or server error encountered.');

  const isNetworkError = errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('fetch');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className={`p-6 sm:p-8 rounded-2xl bg-red-50/60 dark:bg-red-950/20 border border-red-200/80 dark:border-red-900/40 text-center flex flex-col items-center justify-center ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center mb-3 shadow-sm">
        {isNetworkError ? <WifiOff className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
      </div>
      <h3 className="text-base font-bold text-red-950 dark:text-red-200">{title}</h3>
      <p className="text-xs text-red-600 dark:text-red-400 mt-1 max-w-md leading-relaxed">
        {errorMessage}
      </p>
      {retry && (
        <div className="mt-4">
          <Button
            onClick={retry}
            size="sm"
            variant="danger"
            iconLeft={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Retry Request
          </Button>
        </div>
      )}
    </motion.div>
  );
};
