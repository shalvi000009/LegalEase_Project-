import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText } from 'lucide-react';
import { HighlightRegion } from './HighlightOverlay';

interface PDFThumbnailSidebarProps {
  isOpen: boolean;
  numPages: number;
  currentPage: number;
  highlightsByPage?: Record<number, HighlightRegion[]>;
  onSelectPage: (page: number) => void;
  onClose?: () => void;
}

export const PDFThumbnailSidebar: React.FC<PDFThumbnailSidebarProps> = ({
  isOpen,
  numPages,
  currentPage,
  highlightsByPage = {},
  onSelectPage,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 180, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="h-full bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 overflow-y-auto shrink-0 z-20 flex flex-col"
        >
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              Thumbnails ({numPages})
            </span>
          </div>

          <div className="p-3 space-y-3 flex-1">
            {Array.from({ length: Math.max(1, numPages) }, (_, index) => {
              const pageNum = index + 1;
              const isCurrent = currentPage === pageNum;
              const pageHighlights = highlightsByPage[pageNum] || [];

              // High risk vs medium vs low highlights count
              const hasHigh = pageHighlights.some(
                (h) => h.color === 'red' || h.riskLevel === 'high'
              );
              const hasMedium = pageHighlights.some(
                (h) => h.color === 'amber' || h.riskLevel === 'medium'
              );
              const hasLow = pageHighlights.some(
                (h) => h.color === 'green' || h.riskLevel === 'low'
              );

              return (
                <div
                  key={pageNum}
                  onClick={() => onSelectPage(pageNum)}
                  className={`group cursor-pointer rounded-xl p-2 transition-all border flex flex-col items-center gap-1.5 ${
                    isCurrent
                      ? 'bg-white dark:bg-slate-800 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                      : 'bg-white/60 dark:bg-slate-850/60 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Miniature Page Skeleton Representation */}
                  <div className="w-full aspect-[1/1.3] bg-slate-100 dark:bg-slate-950 rounded-lg p-2 relative flex flex-col justify-between border border-slate-200/50 dark:border-slate-800 overflow-hidden shadow-inner">
                    {/* Simulated text lines */}
                    <div className="space-y-1 w-full">
                      <div className="h-1.5 bg-slate-300 dark:bg-slate-800 rounded w-3/4" />
                      <div className="h-1.5 bg-slate-200 dark:bg-slate-850 rounded w-full" />
                      <div className="h-1.5 bg-slate-200 dark:bg-slate-850 rounded w-5/6" />
                      <div className="h-1.5 bg-slate-200 dark:bg-slate-850 rounded w-2/3" />
                    </div>

                    {/* Miniature Overlay Highlight Blocks */}
                    {pageHighlights.length > 0 && (
                      <div className="absolute inset-x-2 bottom-3 space-y-1">
                        {pageHighlights.slice(0, 3).map((h, hIdx) => {
                          const bg =
                            h.color === 'red' || h.riskLevel === 'high'
                              ? 'bg-red-400/60 border-red-500'
                              : h.color === 'green' || h.riskLevel === 'low'
                              ? 'bg-emerald-400/60 border-emerald-500'
                              : 'bg-amber-400/60 border-amber-500';
                          return (
                            <div
                              key={hIdx}
                              className={`h-2 rounded border ${bg} animate-pulse`}
                            />
                          );
                        })}
                      </div>
                    )}

                    <span className="text-[9px] font-mono text-slate-400 self-center">
                      {pageNum}
                    </span>
                  </div>

                  {/* Page Footer Label with Highlight Indicators */}
                  <div className="flex items-center justify-between w-full px-1">
                    <span
                      className={`text-[10px] font-bold ${
                        isCurrent ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'
                      }`}
                    >
                      Page {pageNum}
                    </span>

                    {/* Risk Indicator Dots */}
                    <div className="flex items-center gap-1">
                      {hasHigh && (
                        <span
                          className="w-2 h-2 rounded-full bg-red-500 shadow-sm"
                          title="Contains High Risk Clauses"
                        />
                      )}
                      {hasMedium && !hasHigh && (
                        <span
                          className="w-2 h-2 rounded-full bg-amber-500 shadow-sm"
                          title="Contains Medium Risk Clauses"
                        />
                      )}
                      {hasLow && !hasHigh && !hasMedium && (
                        <span
                          className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm"
                          title="Contains Low Risk Clauses"
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
