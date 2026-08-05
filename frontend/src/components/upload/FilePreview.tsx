import React, { useEffect, useState } from 'react';
import { FileText, FileImage, X, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface FilePreviewProps {
  file: File;
  onRemove?: () => void;
  disabled?: boolean;
}

export const FilePreview: React.FC<FilePreviewProps> = ({ file, onRemove, disabled = false }) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const isPdf = file.type === 'application/pdf';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex items-center justify-between gap-4"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {/* Thumbnail Preview / Icon */}
        <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 overflow-hidden relative group">
          {imagePreview ? (
            <img src={imagePreview} alt={file.name} className="w-full h-full object-cover rounded-xl" />
          ) : isPdf ? (
            <FileText className="w-6 h-6 text-red-500" />
          ) : (
            <FileImage className="w-6 h-6 text-indigo-600" />
          )}
        </div>

        {/* File Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate" title={file.name}>
              {file.name}
            </h4>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {formatSize(file.size)} • {isPdf ? 'PDF Document' : 'Image Contract'}
          </p>
        </div>
      </div>

      {/* Remove Button */}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          aria-label="Remove file"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
};
