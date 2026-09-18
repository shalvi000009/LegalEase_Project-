import React from 'react';
import { Skeleton } from './Skeleton';

interface SkeletonDetailProps {
  className?: string;
}

export const SkeletonDetail: React.FC<SkeletonDetailProps> = ({ className = '' }) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Banner Skeleton */}
      <div className="p-6 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2 flex-1">
          <Skeleton variant="text" className="w-1/3 h-7" />
          <Skeleton variant="text" className="w-1/2 h-4" />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Skeleton variant="text" className="w-24 h-9 rounded-xl" />
          <Skeleton variant="text" className="w-24 h-9 rounded-xl" />
        </div>
      </div>

      {/* Grid details skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main view */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 space-y-4">
            <Skeleton variant="text" className="w-1/4 h-6" />
            <Skeleton variant="text" className="w-full h-4" />
            <Skeleton variant="text" className="w-11/12 h-4" />
            <Skeleton variant="text" className="w-4/5 h-4" />
            <Skeleton variant="text" className="w-full h-4" />
          </div>

          <div className="p-6 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 space-y-4">
            <Skeleton variant="text" className="w-1/3 h-6" />
            <div className="space-y-3">
              <Skeleton variant="card" className="h-20" />
              <Skeleton variant="card" className="h-20" />
              <Skeleton variant="card" className="h-20" />
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 space-y-4">
            <Skeleton variant="text" className="w-1/2 h-5" />
            <Skeleton variant="text" className="w-full h-12 rounded-xl" />
            <Skeleton variant="text" className="w-3/4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
