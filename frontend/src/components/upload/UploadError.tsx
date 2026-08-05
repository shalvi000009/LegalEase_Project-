import React from 'react';
import { AlertTriangle, RefreshCw, UploadCloud, LifeBuoy } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../ui/Button';

interface UploadErrorProps {
  errorTitle?: string;
  errorMessage: string;
  onRetry: () => void;
  onSelectNewFile: () => void;
}

export const UploadError: React.FC<UploadErrorProps> = ({
  errorTitle = 'Upload Failed',
  errorMessage,
  onRetry,
  onSelectNewFile,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-8 rounded-3xl bg-red-50/60 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-center space-y-6"
    >
      <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto shadow-md shadow-red-500/10 animate-bounce">
        <AlertTriangle className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-bold text-red-950 dark:text-red-100">{errorTitle}</h3>
        <p className="text-xs text-red-600 dark:text-red-300 max-w-md mx-auto leading-relaxed">
          {errorMessage}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Button
          onClick={onRetry}
          variant="danger"
          size="sm"
          iconLeft={<RefreshCw className="w-4 h-4" />}
        >
          Try Again
        </Button>

        <Button
          onClick={onSelectNewFile}
          variant="secondary"
          size="sm"
          iconLeft={<UploadCloud className="w-4 h-4" />}
        >
          Upload Different File
        </Button>
      </div>

      <div className="pt-4 border-t border-red-200/60 dark:border-red-900/40">
        <a
          href="mailto:support@legalease.ai"
          className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-300 flex items-center justify-center gap-1.5 underline"
        >
          <LifeBuoy className="w-3.5 h-3.5" />
          Need help? Contact support
        </a>
      </div>
    </motion.div>
  );
};
