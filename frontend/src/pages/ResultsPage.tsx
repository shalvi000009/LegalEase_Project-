import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, ArrowLeft, RefreshCw, FileText, AlertCircle } from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useDocumentAnalysis } from '../hooks/useDocumentAnalysis';
import { useClauseFilter } from '../hooks/useClauseFilter';
import { useClauseSort, SortOption } from '../hooks/useClauseSort';

import { ResultsHeader } from '../components/analysis/ResultsHeader';
import { RiskScoreGauge } from '../components/analysis/RiskScoreGauge';
import { SummaryCard } from '../components/analysis/SummaryCard';
import { MissingClausesAlert } from '../components/analysis/MissingClausesAlert';
import { SuggestedQuestions } from '../components/analysis/SuggestedQuestions';
import { ClauseFilter } from '../components/analysis/ClauseFilter';
import { ClauseCard } from '../components/analysis/ClauseCard';
import { ClauseCardSkeleton } from '../components/analysis/ClauseCardSkeleton';
import { ResultsActions } from '../components/analysis/ResultsActions';

export const ResultsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const docId = id || 'mock-doc-123';

  // Fetch Analysis via TanStack Query Hook
  const { data: analysis, isLoading, isError, refetch } = useDocumentAnalysis(docId);

  // Clause Filter & Search Hook
  const {
    filteredClauses,
    filterLevel,
    setFilterLevel,
    searchQuery,
    setSearchQuery,
    counts,
  } = useClauseFilter(analysis?.red_flags || []);

  // Clause Sort Hook
  const { sortedClauses, sortOption, setSortOption } = useClauseSort(filteredClauses);

  const handleQuestionSelect = (q: string) => {
    // Navigate to Chat page with pre-filled question param
    navigate(`/documents/${docId}/chat?prompt=${encodeURIComponent(q)}`);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-6xl mx-auto space-y-6 pb-12">
          {/* Header Skeleton */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 animate-pulse h-32" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 animate-pulse flex justify-center items-center h-64" />
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 animate-pulse h-48" />
            </div>

            <div className="lg:col-span-5 space-y-4">
              <ClauseCardSkeleton />
              <ClauseCardSkeleton />
              <ClauseCardSkeleton />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (isError || !analysis) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Failed to Load Analysis
          </h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            We encountered an issue fetching the document analysis report. Please try again or re-upload your document.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Button variant="outline" onClick={() => navigate('/documents')} iconLeft={<ArrowLeft className="w-4 h-4" />}>
              Back to Documents
            </Button>
            <Button onClick={() => refetch()} iconLeft={<RefreshCw className="w-4 h-4" />}>
              Retry Analysis
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-20">
        {/* Document Metadata Header */}
        <ResultsHeader analysis={analysis} />

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column (60% desktop - 7 cols): Score Gauge, Summary & Alerts */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-7 space-y-6"
          >
            {/* Prominent Visual Centerpiece: Risk Score Gauge */}
            <Card className="p-8 text-center bg-gradient-to-b from-white via-indigo-50/20 to-white dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900 border-indigo-100 dark:border-slate-800 shadow-md">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
                Overall Contract Risk Score
              </h2>

              <div className="py-2 flex justify-center">
                <RiskScoreGauge score={analysis.risk_score} riskLevel={analysis.risk_level} />
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-4 leading-relaxed">
                Calculated using LegalEase Legal-BERT NLP engine. Identifies potential legal exposure based on clause severity.
              </p>
            </Card>

            {/* AI Summary Card */}
            <SummaryCard analysis={analysis} />

            {/* Missing Clauses Alert */}
            <MissingClausesAlert missingClauses={analysis.missing_clauses} />

            {/* AI Suggested Questions */}
            <SuggestedQuestions
              questions={analysis.suggested_questions}
              onSelectQuestion={handleQuestionSelect}
            />
          </motion.div>

          {/* Right Column (40% desktop - 5 cols): Clause Cards List, Filter & Sort */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-5 space-y-5"
          >
            {/* Right Header Controls: Search & Filter Tabs */}
            <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  Analyzed Clauses ({sortedClauses.length})
                </h3>

                {/* Sort Dropdown */}
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

              {/* Search Bar */}
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

              {/* Filter Tabs */}
              <ClauseFilter activeTab={filterLevel} onTabChange={setFilterLevel} counts={counts} />
            </div>

            {/* Scrollable Cards Container */}
            <div className="space-y-4 max-h-[750px] overflow-y-auto pr-1">
              {sortedClauses.length > 0 ? (
                sortedClauses.map((clause, idx) => (
                  <ClauseCard key={clause.clause_id || idx} clause={clause} index={idx} />
                ))
              ) : (
                <div className="bg-slate-50 dark:bg-slate-900/60 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-8 text-center space-y-2">
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
          </motion.div>
        </div>

        {/* Sticky Action Footer Bar */}
        <ResultsActions
          onAskAI={() => navigate(`/documents/${docId}/chat`)}
        />
      </div>
    </MainLayout>
  );
};
