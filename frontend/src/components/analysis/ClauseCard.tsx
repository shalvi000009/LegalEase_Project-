import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut,
  DollarSign,
  ShieldAlert,
  Copyright,
  UserX,
  Scale,
  MapPin,
  RefreshCw,
  Lock,
  FileWarning,
  CloudLightning,
  BookOpen,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Quote,
} from 'lucide-react';
import { Clause, ClauseType } from '../../types/analysis';
import { RiskBadge } from './RiskBadge';

export interface ClauseCardProps {
  clause: Clause;
  index?: number;
}

// Icon Mapping Function based on Clause Type
const getClauseIcon = (type: ClauseType) => {
  const normalized = String(type).toLowerCase();
  switch (normalized) {
    case 'termination':
      return LogOut;
    case 'payment':
    case 'payment_terms':
      return DollarSign;
    case 'liability':
    case 'limitation_of_liability':
      return ShieldAlert;
    case 'ip':
    case 'intellectual_property':
      return Copyright;
    case 'non_compete':
      return UserX;
    case 'arbitration':
      return Scale;
    case 'jurisdiction':
      return MapPin;
    case 'auto_renewal':
      return RefreshCw;
    case 'data_privacy':
      return Lock;
    case 'indemnity':
      return FileWarning;
    case 'force_majeure':
      return CloudLightning;
    case 'governing_law':
      return BookOpen;
    default:
      return FileText;
  }
};

// Title Formatter
const formatClauseTitle = (type: ClauseType): string => {
  const words = String(type).replace(/_/g, ' ').split(' ');
  const capitalized = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return capitalized.endsWith('Clause') ? capitalized : `${capitalized} Clause`;
};

export const ClauseCard: React.FC<ClauseCardProps> = ({ clause, index = 0 }) => {
  const [showOriginalText, setShowOriginalText] = useState(false);

  const IconComponent = getClauseIcon(clause.clause_type);
  const title = formatClauseTitle(clause.clause_type);

  // Left Border Styling based on Risk Level
  let borderLeftColor = 'border-l-emerald-500';
  if (clause.risk_level === 'high') {
    borderLeftColor = 'border-l-red-500';
  } else if (clause.risk_level === 'medium') {
    borderLeftColor = 'border-l-amber-500';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 border-l-4 ${borderLeftColor} shadow-sm hover:shadow-md transition-all space-y-4`}
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <IconComponent className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h3>
            {clause.page_number && (
              <span className="text-[10px] text-slate-400 font-mono">Page {clause.page_number}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {typeof clause.confidence === 'number' && (
            <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              {Math.round(clause.confidence * 100)}% confidence
            </span>
          )}
          <RiskBadge level={clause.risk_level} showScore={clause.risk_score} size="sm" />
        </div>
      </div>

      {/* Plain English Explanation */}
      <div className="space-y-1.5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Plain-English Summary
        </h4>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
          {clause.explanation}
        </p>
      </div>

      {/* Risk Reason Banner (if available / high risk) */}
      {clause.risk_reason && (
        <div className="p-3 rounded-xl bg-red-50/80 dark:bg-red-950/30 border border-red-200/70 dark:border-red-900/40 text-xs text-red-900 dark:text-red-200 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block mb-0.5">Why this clause is risky:</span>
            <span>{clause.risk_reason}</span>
          </div>
        </div>
      )}

      {/* Fair Standard Recommendation (if available) */}
      {clause.fair_standard && (
        <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/40 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block mb-0.5">Recommended Fair Standard:</span>
            <span>{clause.fair_standard}</span>
          </div>
        </div>
      )}

      {/* Collapsible Original Text Section */}
      {clause.original_text && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowOriginalText((prev) => !prev)}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors focus:outline-none"
          >
            <Quote className="w-3.5 h-3.5" />
            <span>{showOriginalText ? 'Hide original legal text' : 'Show original legal text'}</span>
            {showOriginalText ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <AnimatePresence>
            {showOriginalText && (
              <motion.blockquote
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="mt-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border-l-4 border-indigo-500 text-xs font-mono text-slate-600 dark:text-slate-400 italic leading-relaxed overflow-hidden"
              >
                "{clause.original_text}"
              </motion.blockquote>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};
