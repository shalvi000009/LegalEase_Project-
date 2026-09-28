import React, { useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      iconLeft,
      iconRight,
      containerClassName,
      className,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <motion.div
        className={cn('w-full flex flex-col gap-1.5', containerClassName)}
        animate={error ? { x: [-8, 8, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
      >
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold tracking-wide uppercase text-slate-700 dark:text-slate-300"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {iconLeft && (
            <div className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none flex items-center justify-center">
              {iconLeft}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={cn(
              'w-full px-4 py-2.5 text-sm rounded-xl transition-all duration-200 outline-none',
              'bg-slate-50 dark:bg-slate-900/90 text-slate-900 dark:text-slate-100',
              'border border-slate-300 dark:border-slate-700',
              'placeholder:text-slate-400 dark:placeholder:text-slate-500',
              'focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-400/20',
              error && 'border-red-500 dark:border-red-500 focus:border-red-500 focus:ring-red-500/10',
              iconLeft && 'pl-11',
              iconRight && 'pr-11',
              disabled && 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800',
              className
            )}
            {...props}
          />

          {iconRight && (
            <div className="absolute right-3.5 flex items-center justify-center">
              {iconRight}
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {error ? (
            <motion.p
              key="error"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-xs font-medium text-red-500 dark:text-red-400 flex items-center gap-1 mt-0.5"
            >
              <span>⚠️</span> {error}
            </motion.p>
          ) : helperText ? (
            <motion.p
              key="helper"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-slate-500 dark:text-slate-400 mt-0.5"
            >
              {helperText}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </motion.div>
    );
  }
);

Input.displayName = 'Input';
