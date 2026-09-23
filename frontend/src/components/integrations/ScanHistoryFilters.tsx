import React from 'react';
import { Search, RotateCcw, Filter } from 'lucide-react';
import { ScanAction, ScanHistoryFilters as FiltersType } from '../../types/integrations';

interface ScanHistoryFiltersProps {
  filters: FiltersType;
  onChangeFilters: (newFilters: FiltersType) => void;
  onReset: () => void;
}

const ACTION_OPTIONS: Array<{ value: ScanAction | 'all'; label: string }> = [
  { value: 'all', label: 'All Scans' },
  { value: 'analyzed', label: 'Analyzed' },
  { value: 'classified', label: 'Classified' },
  { value: 'detected', label: 'Detected' },
  { value: 'deduplicated', label: 'Deduplicated' },
  { value: 'skipped', label: 'Skipped' },
  { value: 'failed', label: 'Failed' },
];

export const ScanHistoryFilters: React.FC<ScanHistoryFiltersProps> = ({
  filters,
  onChangeFilters,
  onReset,
}) => {
  const activeAction = filters.action || 'all';

  const handleActionClick = (actionVal: ScanAction | 'all') => {
    onChangeFilters({ ...filters, action: actionVal });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeFilters({ ...filters, search: e.target.value });
  };

  const isFiltered = activeAction !== 'all' || !!filters.search;

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
      {/* Action Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
        <div className="flex items-center gap-1 text-slate-400 text-xs font-bold shrink-0 mr-1">
          <Filter className="w-3.5 h-3.5" />
          <span>Status:</span>
        </div>
        {ACTION_OPTIONS.map((opt) => {
          const isActive = activeAction === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleActionClick(opt.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                isActive
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/80'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Search Input & Reset Button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 md:w-64">
          <input
            type="text"
            placeholder="Search filename or source..."
            value={filters.search || ''}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        {isFiltered && (
          <button
            type="button"
            onClick={onReset}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs font-bold flex items-center gap-1"
            title="Clear filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        )}
      </div>
    </div>
  );
};
