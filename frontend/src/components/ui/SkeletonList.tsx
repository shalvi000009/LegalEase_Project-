import React from 'react';
import { Skeleton } from './Skeleton';

interface SkeletonListProps {
  count?: number;
  className?: string;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
  count = 5,
  className = '',
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5 flex-1 min-w-0">
            <Skeleton variant="avatar" className="w-9 h-9 shrink-0" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <Skeleton variant="text" className="w-1/3 h-4" />
              <Skeleton variant="text" className="w-2/3 h-3" />
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Skeleton variant="text" className="w-16 h-6 rounded-lg" />
            <Skeleton variant="text" className="w-8 h-8 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
};
