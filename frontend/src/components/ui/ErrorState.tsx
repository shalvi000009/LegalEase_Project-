import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  description: string;
  retryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  description,
  retryAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col items-center justify-center p-8 text-center bg-red-50/50 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-900/50 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7" />
      </div>
      <h3 className="text-base font-bold text-red-900 dark:text-red-200">{title}</h3>
      <p className="text-xs text-red-600 dark:text-red-400 max-w-sm mt-1 leading-relaxed">
        {description}
      </p>
      <div className="flex items-center gap-3 mt-6">
        {retryAction && (
          <Button
            onClick={retryAction}
            size="sm"
            variant="danger"
            iconLeft={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Try Again
          </Button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <Button onClick={onSecondaryAction} size="sm" variant="ghost">
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    </motion.div>
  );
};
