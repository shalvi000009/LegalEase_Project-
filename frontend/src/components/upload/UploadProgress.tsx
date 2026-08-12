import React, { useEffect, useState } from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface UploadProgressProps {
  fileName: string;
  fileSize: number;
  progress: number;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  fileName,
  fileSize,
  progress,
}) => {
  const [speed, setSpeed] = useState<string>('Calculating...');

  useEffect(() => {
    // Estimate upload transfer speed based on progress changes
    const calculatedSpeed = ((fileSize * (progress / 100)) / 1024 / 0.5).toFixed(0);
    setSpeed(`${calculatedSpeed} KB/s`);
  }, [progress, fileSize]);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <UploadCloud className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[200px] sm:max-w-xs">
              {fileName}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Uploading • {formatBytes((fileSize * progress) / 100)} of {formatBytes(fileSize)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
          <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
            {progress}%
          </span>
        </div>
      </div>

      {/* Gradient Progress Bar */}
      <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 rounded-full transition-all duration-300 ease-out shadow-sm"
          style={{ width: `${Math.max(5, progress)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
        <span>Transfer Speed: {speed}</span>
        <span>{progress < 100 ? 'Transferring file...' : 'Finalizing upload...'}</span>
      </div>
    </motion.div>
  );
};
