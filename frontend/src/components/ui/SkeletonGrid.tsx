import React from 'react';
import { Skeleton } from './Skeleton';

interface SkeletonGridProps {
  count?: number;
  columns?: 2 | 3 | 4;
  className?: string;
}

export const SkeletonGrid: React.FC<SkeletonGridProps> = ({
  count = 6,
  columns = 3,
  className = '',
}) => {
  const colClass =
    columns === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : columns === 4
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <div className={`grid gap-4 sm:gap-6 ${colClass} ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-5 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 space-y-4"
        >
          <div className="flex items-start justify-between gap-3">
            <Skeleton variant="avatar" className="w-10 h-10" />
            <Skeleton variant="text" className="w-16 h-5" />
          </div>
          <Skeleton variant="text" className="w-3/4 h-5" />
          <Skeleton variant="text" className="w-full h-3" />
          <Skeleton variant="text" className="w-1/2 h-3" />
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <Skeleton variant="text" className="w-20 h-4" />
            <Skeleton variant="text" className="w-12 h-4" />
          </div>
        </div>
      ))}
    </div>
  );
};
