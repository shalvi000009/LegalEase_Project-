import React from 'react';
import { Search, LayoutGrid, List, RotateCcw, Calendar as CalendarIcon } from 'lucide-react';
import { VaultFilters as VaultFilterType } from '../../store/vaultStore';
import { ContractStatus } from '../../types/dates';

interface VaultFiltersProps {
  filters: VaultFilterType;
  onFilterChange: (updated: Partial<VaultFilterType>) => void;
  onReset: () => void;
  onToggleView: () => void;
}

export const VaultFilters: React.FC<VaultFiltersProps> = ({
  filters,
  onFilterChange,
  onReset,
  onToggleView,
}) => {
  return (
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 space-y-3.5 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)] dark:shadow-none backdrop-blur-xl transition-all">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onFilterChange({ search: e.target.value })}
              placeholder="Search contracts by name or document category..."
              className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700/80 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner"
            />
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filters.status}
              onChange={(e) => onFilterChange({ status: e.target.value as ContractStatus | 'all' })}
              className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="expiring_soon">Expiring Soon</option>
              <option value="expired">Expired</option>
              <option value="renewed">Renewed</option>
            </select>

            {/* Sort By */}
            <select
              value={filters.sortBy}
              onChange={(e) => onFilterChange({ sortBy: e.target.value as VaultFilterType['sortBy'] })}
              className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm cursor-pointer"
            >
              <option value="expiryDate">Sort: Expiry Date</option>
              <option value="name">Sort: Contract Name</option>
              <option value="riskScore">Sort: Risk Score</option>
              <option value="uploadDate">Sort: Upload Date</option>
            </select>

            {/* Sort Order */}
            <button
              onClick={() => onFilterChange({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
              className="px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-xs font-bold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-all shadow-sm active:scale-95"
              title="Toggle sort order"
            >
              {filters.sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
            </button>

            {/* Reset Filters */}
            <button
              onClick={onReset}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all shadow-sm active:scale-95"
              title="Reset Filters"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Grid/List View Toggle */}
            <button
              onClick={onToggleView}
              className="p-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-600/20 dark:hover:bg-indigo-600/30 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-400 transition-all shadow-sm active:scale-95"
              title={`Switch to ${filters.viewMode === 'grid' ? 'List' : 'Grid'} View`}
            >
              {filters.viewMode === 'grid' ? (
                <List className="w-4 h-4" />
              ) : (
                <LayoutGrid className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Date Range Controls */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-xs">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <CalendarIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Expiry Date Range:
              </span>
              <input
                type="date"
                value={filters.dateRange.from || ''}
                onChange={(e) => onFilterChange({ dateRange: { ...filters.dateRange, from: e.target.value } })}
                className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
                placeholder="From"
              />
              <span className="text-slate-500 dark:text-slate-400 font-medium">to</span>
              <input
                type="date"
                value={filters.dateRange.to || ''}
                onChange={(e) => onFilterChange({ dateRange: { ...filters.dateRange, to: e.target.value } })}
                className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
                placeholder="To"
              />
              {(filters.dateRange.from || filters.dateRange.to) && (
                <button
                  onClick={() => onFilterChange({ dateRange: {} })}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline ml-1.5"
                >
                  Clear dates
                </button>
              )}
            </div>
        </div>
        );
};
