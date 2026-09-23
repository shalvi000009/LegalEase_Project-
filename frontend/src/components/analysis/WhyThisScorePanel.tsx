import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronDown, ChevronUp, AlertCircle, ArrowRight } from 'lucide-react';
import {
  Clause,
  RiskDimensions,
  RiskDimensionKey,
  DIMENSION_LABELS,
  DIMENSION_WEIGHTS,
  getDimensionsForClauseType,
} from '../../types/analysis';

interface WhyThisScorePanelProps {
  clauses: Clause[];
  riskDimensions?: RiskDimensions;
  onSelectClause?: (clause: Clause) => void;
  className?: string;
}

const DIMENSION_KEYS: RiskDimensionKey[] = ['legal', 'financial', 'litigation', 'privacy', 'employment'];

const getDimensionColor = (score: number) => {
  if (score > 70) return { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/40', border: 'border-red-200 dark:border-red-900/50' };
  if (score > 40) return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-900/50' };
  return { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-900/50' };
};

export const WhyThisScorePanel: React.FC<WhyThisScorePanelProps> = ({
  clauses,
  riskDimensions,
  onSelectClause,
  className = '',
}) => {
  const [openDimension, setOpenDimension] = useState<RiskDimensionKey | 'all' | null>('legal');

  // Map each dimension to its top contributing clauses
  const dimensionBreakdowns = DIMENSION_KEYS.map((dimKey) => {
    const matchingClauses = clauses
      .filter((c) => getDimensionsForClauseType(c.clause_type).includes(dimKey))
      .sort((a, b) => b.risk_score - a.risk_score)
      .slice(0, 3);

    const score = riskDimensions ? riskDimensions[dimKey] : 50;
    const weight = Math.round(DIMENSION_WEIGHTS[dimKey] * 100);

    return {
      dimKey,
      label: DIMENSION_LABELS[dimKey],
      score,
      weight,
      clauses: matchingClauses,
    };
  });

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 ${className}`}
    >
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Why This Score?
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              Top clause contributors for each risk dimension
            </p>
          </div>
        </div>
      </div>

      {/* Accordion / List of Dimensions */}
      <div className="space-y-2">
        {dimensionBreakdowns.map(({ dimKey, label, score, weight, clauses: dimClauses }) => {
          const isOpen = openDimension === 'all' || openDimension === dimKey;
          const colorStyle = getDimensionColor(score);

          return (
            <div
              key={dimKey}
              className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50/50 dark:bg-slate-950/40"
            >
              <button
                type="button"
                onClick={() => setOpenDimension(isOpen ? null : dimKey)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className={`text-xs font-black font-mono px-2 py-0.5 rounded-md ${colorStyle.bg} ${colorStyle.text}`}>
                    {score}
                  </span>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      {label} Risk
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {weight}% weight in overall score
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-medium">
                    {dimClauses.length} {dimClauses.length === 1 ? 'clause' : 'clauses'}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-2"
                  >
                    {dimClauses.length > 0 ? (
                      dimClauses.map((clause, idx) => (
                        <div
                          key={clause.clause_id || idx}
                          onClick={() => onSelectClause && onSelectClause(clause)}
                          className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 bg-slate-50/70 dark:bg-slate-950/60 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 cursor-pointer transition-all space-y-1 group"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-1.5 capitalize">
                              {clause.clause_type.replace(/_/g, ' ')}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                                clause.risk_score > 70 ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              }`}>
                                {clause.risk_score} pts
                              </span>
                              <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">
                            {clause.explanation}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center gap-2 p-2 text-xs text-slate-400 italic">
                        <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                        No high-risk clauses found specifically for {label.toLowerCase()} dimension.
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};
