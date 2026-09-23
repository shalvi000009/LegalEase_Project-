import React, { useRef, useState } from 'react';
import { Search, SlidersHorizontal, ArrowUp, FileText } from 'lucide-react';
import { AnalysisResult, Clause } from '../../types/analysis';
import { DocumentOverview } from './DocumentOverview';
import { RiskDimensionChart } from './RiskDimensionChart';
import { WhyThisScorePanel } from './WhyThisScorePanel';
import { ClauseFilter } from './ClauseFilter';
import { ClauseCard } from './ClauseCard';
import { useClauseFilter } from '../../hooks/useClauseFilter';
import { useClauseSort, SortOption } from '../../hooks/useClauseSort';
import { Button } from '../ui/Button';

interface ResultsSidebarProps {
  analysis: AnalysisResult;
  selectedClauseId?: string | null;
  onViewInDocument?: (clause: Clause) => void;
  onAskAI?: (clause: Clause) => void;
}

export const ResultsSidebar: React.FC<ResultsSidebarProps> = ({
  analysis,
  selectedClauseId,
  onViewInDocument,
  onAskAI,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Clause Filter & Search Hook
  const {
    filteredClauses,
    filterLevel,
    setFilterLevel,
    searchQuery,
    setSearchQuery,
    counts,
  } = useClauseFilter(analysis.red_flags || []);

  // Clause Sort Hook
  const { sortedClauses, sortOption, setSortOption } = useClauseSort(filteredClauses);

  const handleScroll = () => {
    if (containerRef.current) {
      setShowScrollTop(containerRef.current.scrollTop > 300);
    }
  };

  const scrollToTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-full overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50 p-4 md:p-6 space-y-5 relative scroll-smooth"
    >
      {/* Document Overview Metadata Card */}
      <DocumentOverview analysis={analysis} />

      {/* Week 10 Enhancement: 5 Risk Dimensions Radar Chart Visual */}
      <RiskDimensionChart dimensions={analysis.risk_dimensions} />

      {/* Week 10 Enhancement: Why This Score Panel */}
      <WhyThisScorePanel
        clauses={analysis.red_flags || []}
        riskDimensions={analysis.risk_dimensions}
        onSelectClause={(clause) => onViewInDocument && onViewInDocument(clause)}
      />

      {/* Search & Filter Controls Header */}
      <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-indigo-500" />
            Analyzed Clauses ({sortedClauses.length})
          </h3>

          {/* Sort Selector */}
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg px-2 py-1 border-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="risk-desc">Risk (High → Low)</option>
              <option value="risk-asc">Risk (Low → High)</option>
              <option value="type">Clause Type</option>
              <option value="page">Page Order</option>
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search clauses by keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        {/* Risk Filter Tabs */}
        <ClauseFilter activeTab={filterLevel} onTabChange={setFilterLevel} counts={counts} />
      </div>

      {/* Clause Cards List */}
      <div className="space-y-4 pb-12">
        {sortedClauses.length > 0 ? (
          sortedClauses.map((clause, idx) => (
            <ClauseCard
              key={clause.clause_id || idx}
              clause={clause}
              index={idx}
              isSelected={selectedClauseId === clause.clause_id}
              onViewInDocument={onViewInDocument}
              onAskAI={onAskAI}
            />
          ))
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-8 text-center space-y-2">
            <FileText className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No matching clauses found
            </h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Try adjusting your risk filter or search query.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterLevel('all');
                setSearchQuery('');
              }}
              className="mt-2 text-indigo-600"
            >
              Reset Filters
            </Button>
          </div>
        )}
      </div>

      {/* Floating Scroll-to-Top Button */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-20 right-6 z-40 p-2.5 rounded-full bg-indigo-600 text-white shadow-xl hover:bg-indigo-700 transition-all transform hover:scale-110 active:scale-95"
          title="Scroll to Top"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
