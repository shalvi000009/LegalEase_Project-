import React from 'react';

export const ClauseCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 border-l-4 border-l-slate-300 dark:border-l-slate-700 shadow-sm animate-pulse space-y-4">
      {/* Header Row Skeleton */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-1">
            <div className="w-32 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="w-16 h-3 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>
        </div>
        <div className="w-20 h-6 bg-slate-200 dark:bg-slate-800 rounded-full" />
      </div>

      {/* Summary Skeleton */}
      <div className="space-y-2">
        <div className="w-24 h-3 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="w-full h-3.5 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="w-4/5 h-3.5 bg-slate-200 dark:bg-slate-800 rounded" />
      </div>

      {/* Button Skeleton */}
      <div className="w-36 h-4 bg-slate-200 dark:bg-slate-800 rounded pt-1" />
    </div>
  );
};
