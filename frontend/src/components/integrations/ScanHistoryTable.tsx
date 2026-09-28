import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { History, Sparkles, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { ScanHistoryRow } from './ScanHistoryRow';
import { ScanHistoryFilters } from './ScanHistoryFilters';
import { useScanHistory } from '../../hooks/useScanHistory';
import { ScanHistoryFilters as FiltersType } from '../../types/integrations';

export const ScanHistoryTable: React.FC = () => {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FiltersType>({ action: 'all', search: '' });
  const limit = 8;

  const { data: response, isLoading, isFetching } = useScanHistory(page, limit, filters);

  const scanHistory = response?.data || [];
  const totalPages = response?.totalPages || 1;
  const totalEntries = response?.total || 0;

  const handleResetFilters = () => {
    setFilters({ action: 'all', search: '' });
    setPage(1);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  return (
    <div className="space-y-4">
      {/* Header & Section Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Auto-Scan Activity Log
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live automated classification & extraction logs from connected inboxes & drives
            </p>
          </div>
        </div>

        {isFetching && (
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 self-start sm:self-auto bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
            <Sparkles className="w-3 h-3 animate-spin" />
            Syncing logs...
          </span>
        )}
      </div>

      {/* Filter Bar Component */}
      <ScanHistoryFilters
        filters={filters}
        onChangeFilters={(f) => {
          setFilters(f);
          setPage(1);
        }}
        onReset={handleResetFilters}
      />

      {/* Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <div className="col-span-5 sm:col-span-4">Source Document / Ref</div>
          <div className="col-span-3 sm:col-span-3">Action Status</div>
          <div className="hidden sm:block col-span-3">Confidence Score</div>
          <div className="col-span-4 sm:col-span-2 text-right">Timestamp</div>
        </div>

        {/* Loading Skeleton State */}
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-12 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : scanHistory.length === 0 ? (
          /* Empty State */
          <div className="p-12 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Inbox className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              No Scans Found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {filters.action !== 'all' || filters.search
                ? 'No activity matching your search filters. Try resetting filters.'
                : 'No scans yet. Connect a Gmail or Google Drive account to start auto-scanning.'}
            </p>
            {(filters.action !== 'all' || filters.search) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
              >
                Clear Search Filters
              </button>
            )}
          </div>
        ) : (
          /* Scan History Rows with Framer Motion Stagger */
          <motion.div variants={containerVariants} initial="hidden" animate="show">
            {scanHistory.map((entry) => (
              <ScanHistoryRow key={entry.id} entry={entry} />
            ))}
          </motion.div>
        )}

        {/* Table Footer & Pagination */}
        {totalEntries > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200/60 dark:border-slate-800 text-xs text-slate-500">
            <div>
              Showing <span className="font-bold text-slate-800 dark:text-slate-200">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {Math.min(page * limit, totalEntries)}
              </span>{' '}
              of <span className="font-bold text-slate-800 dark:text-slate-200">{totalEntries}</span> scan entries
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 px-2 font-mono">
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
