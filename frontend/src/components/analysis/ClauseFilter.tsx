import React from 'react';
import { motion } from 'framer-motion';
import { FilterLevel } from '../../hooks/useClauseFilter';

export interface ClauseFilterProps {
  activeTab: FilterLevel;
  onTabChange: (tab: FilterLevel) => void;
  counts: {
    all: number;
    high: number;
    medium: number;
    low: number;
  };
}

export const ClauseFilter: React.FC<ClauseFilterProps> = ({
  activeTab,
  onTabChange,
  counts,
}) => {
  const tabs: { key: FilterLevel; label: string; count: number; colorClass?: string }[] = [
    { key: 'all', label: 'All Clauses', count: counts.all },
    { key: 'high', label: 'High Risk', count: counts.high, colorClass: 'text-red-500' },
    { key: 'medium', label: 'Medium Risk', count: counts.medium, colorClass: 'text-amber-500' },
    { key: 'low', label: 'Low Risk', count: counts.low, colorClass: 'text-emerald-500' },
  ];

  return (
    <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto select-none">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap focus:outline-none ${
              isActive
                ? 'text-indigo-950 dark:text-indigo-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {/* Active Pill Animated Background */}
            {isActive && (
              <motion.div
                layoutId="activeFilterTab"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="absolute inset-0 bg-white dark:bg-indigo-950/80 border border-slate-200 dark:border-indigo-800/80 rounded-xl shadow-xs"
              />
            )}

            <span className="relative z-10">{tab.label}</span>

            {/* Badge Count */}
            <span
              className={`relative z-10 px-2 py-0.5 rounded-full text-[10px] font-mono ${
                isActive
                  ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              } ${tab.colorClass || ''}`}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
};
