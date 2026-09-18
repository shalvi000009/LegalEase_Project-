import React from 'react';
import { Card } from '../ui/Card';

export const DocumentCardSkeleton: React.FC = () => {
  return (
    <Card className="p-5 space-y-4 animate-pulse border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700" />
        <div className="w-20 h-5 rounded-full bg-slate-200 dark:bg-slate-700" />
      </div>

      <div className="space-y-2">
        <div className="w-3/4 h-4 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="w-1/2 h-3 rounded bg-slate-100 dark:bg-slate-800" />
      </div>

      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="w-24 h-4 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="w-16 h-7 rounded-lg bg-slate-200 dark:bg-slate-700" />
      </div>
    </Card>
  );
};
