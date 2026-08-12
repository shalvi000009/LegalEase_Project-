import React, { useEffect, useState } from 'react';
import { Check, FileText, Loader2, Sparkles, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';

interface ProcessingStatusProps {
  fileName: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed' | 'uploaded' | 'done';
  progress?: number;
  onCancel?: () => void;
}

const STEPS = [
  { id: 'upload', label: 'Upload' },
  { id: 'processing', label: 'Processing' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'complete', label: 'Complete' },
];

const MICRO_MESSAGES = [
  'Reading contract document structure...',
  'Extracting text & applying PyMuPDF OCR...',
  'Identifying key legal clauses & obligations...',
  'Calculating AI risk scores & compliance checks...',
  'Finalizing detailed analysis summary...',
];

export const ProcessingStatus: React.FC<ProcessingStatusProps> = ({
  fileName,
  status,
  progress = 0,
  onCancel,
}) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [estimatedSeconds, setEstimatedSeconds] = useState(35);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % MICRO_MESSAGES.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setEstimatedSeconds((prev) => (prev > 5 ? prev - 1 : prev));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getActiveStepIndex = () => {
    if (status === 'completed' || status === 'done') return 3;
    if (progress > 75) return 2;
    if (status === 'processing' || progress > 25) return 1;
    return 0;
  };

  const activeIndex = getActiveStepIndex();

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              AI Contract Processing
            </h3>
          </div>
          <p className="text-xs text-slate-500 truncate max-w-xs mt-0.5">{fileName}</p>
        </div>

        {onCancel && status !== 'completed' && status !== 'done' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            iconLeft={<XCircle className="w-4 h-4 text-slate-400" />}
          >
            Cancel
          </Button>
        )}
      </div>

      {/* Interactive Scanning Visual */}
      <div className="relative w-full py-8 flex flex-col items-center justify-center bg-slate-50/70 dark:bg-slate-950/60 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 overflow-hidden">
        {/* Horizontal Laser Scanning Line */}
        {status !== 'completed' && status !== 'done' && (
          <motion.div
            className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_15px_#6366f1]"
            animate={{ top: ['10%', '90%', '10%'] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
          />
        )}

        {/* Document graphic */}
        <div className="relative w-24 h-32 rounded-xl bg-white dark:bg-slate-900 border-2 border-indigo-200 dark:border-indigo-900 p-3 shadow-lg flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-full h-2 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="w-3/4 h-2 rounded bg-indigo-200 dark:bg-indigo-900" />
            <div className="w-5/6 h-2 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="w-2/3 h-2 rounded bg-indigo-100 dark:bg-indigo-950" />
          </div>

          <div className="flex items-center justify-between text-indigo-500">
            <FileText className="w-5 h-5" />
            <span className="text-[9px] font-bold">PDF</span>
          </div>
        </div>

        {/* Dynamic status message underneath */}
        <div className="mt-6 text-center px-4">
          <AnimatePresence mode="wait">
            <motion.p
              key={messageIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-2"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {MICRO_MESSAGES[messageIndex]}
            </motion.p>
          </AnimatePresence>
          <p className="text-[11px] text-slate-400 mt-1">
            Estimated time remaining: ~{estimatedSeconds} seconds
          </p>
        </div>
      </div>

      {/* 4-Step Animated Indicator */}
      <div className="grid grid-cols-4 gap-2 pt-2">
        {STEPS.map((step, idx) => {
          const isCompleted = idx < activeIndex;
          const isCurrent = idx === activeIndex;

          return (
            <div key={step.id} className="flex flex-col items-center text-center gap-2">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : isCurrent
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 ring-4 ring-indigo-100 dark:ring-indigo-950'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : isCurrent ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                ) : (
                  <span className="text-xs font-bold">{idx + 1}</span>
                )}
              </div>
              <span
                className={`text-[11px] font-bold ${
                  isCompleted
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : isCurrent
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
