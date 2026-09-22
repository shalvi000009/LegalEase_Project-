import React from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';

export type StepStatus = 'pending' | 'active' | 'completed';

export interface ProcessingStepProps {
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  status: StepStatus;
  stepNumber: number;
}

export const ProcessingStep: React.FC<ProcessingStepProps> = ({
  icon,
  label,
  subtitle,
  status,
  stepNumber,
}) => {
  const isCompleted = status === 'completed';
  const isActive = status === 'active';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: stepNumber * 0.1 }}
      className={`relative flex items-start gap-4 p-4 rounded-2xl border transition-all duration-300 ${
        isActive
          ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500/50 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/30'
          : isCompleted
          ? 'bg-slate-50/60 dark:bg-slate-900/40 border-emerald-500/30 dark:border-emerald-900/40'
          : 'bg-slate-50/30 dark:bg-slate-900/20 border-slate-200/50 dark:border-slate-800/50 opacity-60'
      }`}
    >
      {/* Left Icon / Status Indicator */}
      <div className="relative flex-shrink-0">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold transition-colors ${
            isActive
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 animate-pulse'
              : isCompleted
              ? 'bg-emerald-500 text-white'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
          }`}
        >
          {isCompleted ? (
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            >
              <Check className="w-6 h-6 stroke-[3]" />
            </motion.div>
          ) : isActive ? (
            <div className="relative flex items-center justify-center">
              {icon}
              <Loader2 className="w-8 h-8 text-indigo-200 absolute animate-spin" />
            </div>
          ) : (
            icon
          )}
        </div>
      </div>

      {/* Step Info */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center justify-between gap-2">
          <h4
            className={`text-sm font-semibold tracking-wide ${
              isActive
                ? 'text-indigo-950 dark:text-indigo-200 font-bold'
                : isCompleted
                ? 'text-slate-800 dark:text-slate-200'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {label}
          </h4>

          <span
            className={`text-[11px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider ${
              isActive
                ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 animate-pulse'
                : isCompleted
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            }`}
          >
            {isActive ? 'Processing...' : isCompleted ? 'Complete' : 'Queued'}
          </span>
        </div>

        <p
          className={`text-xs mt-1 leading-relaxed ${
            isActive
              ? 'text-indigo-700 dark:text-indigo-300 font-medium'
              : isCompleted
              ? 'text-slate-500 dark:text-slate-400'
              : 'text-slate-400 dark:text-slate-600'
          }`}
        >
          {subtitle}
        </p>
      </div>
    </motion.div>
  );
};
