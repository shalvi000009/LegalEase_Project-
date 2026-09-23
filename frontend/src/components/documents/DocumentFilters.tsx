import React from 'react';
import { Search, Filter, ArrowUpDown, X } from 'lucide-react';
import { useDocumentStore, DocumentFilterStatus, DocumentSortOption } from '../../store/documentStore';

export const DocumentFilters: React.FC = () => {
  const {
    searchQuery,
    filterStatus,
    sortBy,
    setSearchQuery,
    setFilterStatus,
    setSortBy,
  } = useDocumentStore();

  const filterChips: { label: string; value: DocumentFilterStatus }[] = [
    { label: 'All', value: 'all' },
    { label: 'Completed', value: 'completed' },
    { label: 'Processing', value: 'processing' },
    { label: 'Failed', value: 'failed' },
  ];

  const sortOptions: { label: string; value: DocumentSortOption }[] = [
    { label: 'Newest First', value: 'newest' },
    { label: 'Oldest First', value: 'oldest' },
    { label: 'Highest Risk', value: 'risk_high' },
    { label: 'Name (A-Z)', value: 'name' },
  ];

  const hasActiveFilters = searchQuery.trim() !== '' || filterStatus !== 'all' || sortBy !== 'newest';

  const handleClear = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setSortBy('newest');
  };

  return (
    <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[220px]">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search documents by filename..."
          className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Status Filter Chips */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          {filterChips.map((chip) => (
            <button
              key={chip.value}
              onClick={() => setFilterStatus(chip.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterStatus === chip.value
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <div className="relative flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as DocumentSortOption)}
            className="bg-transparent focus:outline-none cursor-pointer pr-1 text-xs font-medium text-slate-800 dark:text-slate-200"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-600 px-2 py-1"
          >
            <Filter className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
};
