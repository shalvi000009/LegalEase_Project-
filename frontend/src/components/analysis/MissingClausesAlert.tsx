import React, { useState } from 'react';
import { AlertTriangle, HelpCircle, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface MissingClausesAlertProps {
  missingClauses: string[];
}

const MISSING_CLAUSE_EXPLANATIONS: Record<string, string> = {
  severance_package: 'Protects employee by guaranteeing severance pay if terminated without cause.',
  notice_period_protection: 'Ensures equal and fair notice duration before termination for both parties.',
  limitation_of_liability_cap: 'Caps the maximum financial liability to protect you from catastrophic damage claims.',
  ip_side_projects_exemption: 'Explicitly excludes personal projects made on off-hours from company IP ownership.',
};

export const MissingClausesAlert: React.FC<MissingClausesAlertProps> = ({ missingClauses }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!missingClauses || missingClauses.length === 0) {
    return null;
  }

  return (
    <div className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-3xl p-5 shadow-xs space-y-3 text-amber-950 dark:text-amber-200">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold tracking-tight">
            Missing Standard Protective Clauses ({missingClauses.length})
          </h3>
        </div>

        <button
          type="button"
          onClick={() => setShowTooltip((prev) => !prev)}
          className="text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1 focus:outline-none"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Why this matters</span>
        </button>
      </div>

      {/* Why it matters Tooltip Drawer */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3.5 rounded-xl bg-amber-100/70 dark:bg-amber-900/40 text-xs leading-relaxed text-amber-900 dark:text-amber-200 space-y-1 overflow-hidden"
          >
            <p className="font-bold">Why missing clauses create legal risk:</p>
            <p>
              Standard protective clauses ensure balanced obligations and protect you from unexpected liabilities or unilateral changes. Omitting them leaves you vulnerable to legal ambiguities.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List of Missing Clauses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        {missingClauses.map((clauseKey, idx) => {
          const formattedName = clauseKey
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase());

          const explanation =
            MISSING_CLAUSE_EXPLANATIONS[clauseKey] ||
            'Recommended standard clause missing from this agreement.';

          return (
            <div
              key={idx}
              className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-amber-200/60 dark:border-amber-900/40 text-xs space-y-0.5"
            >
              <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span>{formattedName}</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 pl-5">{explanation}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
