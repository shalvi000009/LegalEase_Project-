import React from 'react';

export const ContractCardSkeleton: React.FC = () => {
  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 bg-slate-800 rounded-xl" />
        <div className="w-20 h-5 bg-slate-800 rounded-full" />
      </div>

      <div className="space-y-2">
        <div className="h-5 bg-slate-800 rounded w-3/4" />
        <div className="h-3 bg-slate-800/60 rounded w-1/2" />
      </div>

      <div className="pt-2 border-t border-slate-800/60 grid grid-cols-2 gap-2">
        <div className="h-4 bg-slate-800/60 rounded" />
        <div className="h-4 bg-slate-800/60 rounded" />
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="w-24 h-8 bg-slate-800 rounded-lg" />
        <div className="w-16 h-8 bg-slate-800 rounded-lg" />
      </div>
    </div>
  );
};
