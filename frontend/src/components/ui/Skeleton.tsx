import React from 'react';
import { cn } from '../../utils/cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'card' | 'avatar';
  shimmer?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  shimmer = true,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-slate-200/80 dark:bg-slate-800/80',
        shimmer
          ? 'after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.8s_infinite] after:bg-gradient-to-r after:from-transparent after:via-slate-100/60 dark:after:via-slate-700/50 after:to-transparent'
          : 'animate-pulse',
        variant === 'text' && 'h-4 w-full rounded-md',
        variant === 'circular' && 'rounded-full',
        variant === 'avatar' && 'w-10 h-10 rounded-full shrink-0',
        variant === 'rectangular' && 'rounded-xl',
        variant === 'card' && 'h-32 w-full rounded-2xl border border-slate-200/60 dark:border-slate-800/60',
        className
      )}
      {...props}
    />
  );
};
