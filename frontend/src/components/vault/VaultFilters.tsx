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
    <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 backdrop-blur-xl">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            placeholder="Search contracts by name or document category..."
            className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filters.status}
            onChange={(e) => onFilterChange({ status: e.target.value as ContractStatus | 'all' })}
            className="bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
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
            className="bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="expiryDate">Sort: Expiry Date</option>
            <option value="name">Sort: Contract Name</option>
            <option value="riskScore">Sort: Risk Score</option>
            <option value="uploadDate">Sort: Upload Date</option>
          </select>

          {/* Sort Order */}
          <button
            onClick={() => onFilterChange({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
            className="px-2.5 py-2 rounded-xl bg-slate-950/80 border border-slate-700/80 text-xs font-medium text-slate-300 hover:text-white"
            title="Toggle sort order"
          >
            {filters.sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
          </button>

          {/* Reset Filters */}
          <button
            onClick={onReset}
            className="p-2 rounded-xl bg-slate-950/80 border border-slate-700/80 text-slate-400 hover:text-white transition-colors"
            title="Reset Filters"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Grid/List View Toggle */}
          <button
            onClick={onToggleView}
            className="p-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/30 transition-colors"
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
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60 text-xs text-slate-400">
        <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
          <CalendarIcon className="w-3.5 h-3.5" /> Expiry Date Range:
        </span>
        <input
          type="date"
          value={filters.dateRange.from || ''}
          onChange={(e) => onFilterChange({ dateRange: { ...filters.dateRange, from: e.target.value } })}
          className="bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          placeholder="From"
        />
        <span>to</span>
        <input
          type="date"
          value={filters.dateRange.to || ''}
          onChange={(e) => onFilterChange({ dateRange: { ...filters.dateRange, to: e.target.value } })}
          className="bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          placeholder="To"
        />
        {(filters.dateRange.from || filters.dateRange.to) && (
          <button
            onClick={() => onFilterChange({ dateRange: {} })}
            className="text-[11px] text-rose-400 hover:underline ml-1"
          >
            Clear dates
          </button>
        )}
      </div>
    </div>
  );
};
