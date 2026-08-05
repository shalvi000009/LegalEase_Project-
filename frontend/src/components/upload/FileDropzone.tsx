import React from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText, Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn';

interface FileDropzoneProps {
  onDrop: (acceptedFiles: File[], fileRejections: any[]) => void;
  acceptedTypes?: Record<string, string[]>;
  maxSize?: number;
  disabled?: boolean;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onDrop,
  acceptedTypes = {
    'application/pdf': ['.pdf'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
  },
  maxSize = 10 * 1024 * 1024, // 10MB default
  disabled = false,
}) => {
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: acceptedTypes,
    maxSize,
    multiple: false,
    disabled,
  });

  return (
    <div
      {...getRootProps()}
      tabIndex={disabled ? -1 : 0}
      className={cn(
        'relative min-h-[320px] rounded-2xl border-2 border-dashed p-8 transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer outline-none group select-none',
        isDragActive && !isDragReject
          ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 scale-[1.02] shadow-xl shadow-indigo-500/10'
          : isDragReject
          ? 'border-red-500 bg-red-50/60 dark:bg-red-950/30'
          : 'border-indigo-200 dark:border-indigo-900/60 bg-white/40 dark:bg-slate-900/40 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 hover:shadow-lg hover:shadow-indigo-500/5',
        disabled && 'opacity-50 cursor-not-allowed hover:border-indigo-200 hover:bg-transparent hover:shadow-none'
      )}
    >
      <input {...getInputProps()} />

      {/* Decorative gradient glowing orb */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-indigo-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center">
        {/* Animated Icon badge */}
        <div
          className={cn(
            'w-20 h-20 rounded-2xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110 shadow-md',
            isDragActive
              ? 'bg-indigo-600 text-white shadow-indigo-500/30 animate-bounce'
              : 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white'
          )}
        >
          {isDragActive ? (
            <Sparkles className="w-10 h-10 animate-spin" />
          ) : (
            <UploadCloud className="w-10 h-10" />
          )}
        </div>

        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {isDragActive
            ? 'Drop contract file right here'
            : 'Drag & drop your contract here'}
        </h3>

        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-sm leading-relaxed">
          Or <span className="font-semibold text-indigo-600 dark:text-indigo-400 underline underline-offset-2">browse file</span> from your computer
        </p>

        <div className="mt-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          <FileText className="w-3.5 h-3.5 text-indigo-500" />
          <span>Supports PDF, JPG, PNG up to 10MB</span>
        </div>
      </div>
    </div>
  );
};
