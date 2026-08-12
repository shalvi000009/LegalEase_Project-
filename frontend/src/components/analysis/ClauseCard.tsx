import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
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
  Eye,
  MessageSquarePlus,
  Copy,
  Flag,
  Check,
} from 'lucide-react';
import { Clause, ClauseType } from '../../types/analysis';
import { RiskBadge } from './RiskBadge';
import { Button } from '../ui/Button';

export interface ClauseCardProps {
  clause: Clause;
  index?: number;
  isSelected?: boolean;
  onViewInDocument?: (clause: Clause) => void;
  onAskAI?: (clause: Clause) => void;
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

export const ClauseCard: React.FC<ClauseCardProps> = ({
  clause,
  index = 0,
  isSelected = false,
  onViewInDocument,
  onAskAI,
}) => {
  const [showOriginalText, setShowOriginalText] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFlagged, setIsFlagged] = useState(false);

  const IconComponent = getClauseIcon(clause.clause_type);
  const title = formatClauseTitle(clause.clause_type);

  // Left Border Styling based on Risk Level
  let borderLeftColor = 'border-l-emerald-500';
  if (clause.risk_level === 'high') {
    borderLeftColor = 'border-l-red-500';
  } else if (clause.risk_level === 'medium') {
    borderLeftColor = 'border-l-amber-500';
  }

  const handleCopyText = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (clause.original_text) {
      navigator.clipboard.writeText(clause.original_text);
      setCopied(true);
      toast.success('Original clause text copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleToggleFlag = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlagged((prev) => !prev);
    if (!isFlagged) {
      toast('Clause flagged for review', { icon: '🚩' });
    } else {
      toast.success('Flag removed');
    }
  };

  return (
    <motion.div
      id={`clause-card-${clause.clause_id}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border border-l-4 ${borderLeftColor} shadow-sm transition-all space-y-4 ${
        isSelected
          ? 'border-indigo-500 shadow-lg ring-2 ring-indigo-500/20 bg-indigo-50/10 dark:bg-indigo-950/10'
          : 'border-slate-200 dark:border-slate-800 hover:shadow-md'
      }`}
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <IconComponent className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              {title}
              {isFlagged && (
                <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 rounded font-mono font-bold">
                  <Flag className="w-3 h-3 fill-amber-500 text-amber-500" /> Flagged
                </span>
              )}
            </h3>
            {clause.page_number && (
              <span className="text-[10px] text-slate-400 font-mono">Page {clause.page_number}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {typeof clause.confidence === 'number' && (
            <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              {Math.round(clause.confidence * 100)}% match
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

      {/* Risk Reason Banner */}
      {clause.risk_reason && (
        <div className="p-3 rounded-xl bg-red-50/80 dark:bg-red-950/30 border border-red-200/70 dark:border-red-900/40 text-xs text-red-900 dark:text-red-200 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block mb-0.5">Why this clause is risky:</span>
            <span>{clause.risk_reason}</span>
          </div>
        </div>
      )}

      {/* Fair Standard Recommendation */}
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
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowOriginalText((prev) => !prev)}
              className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors focus:outline-none"
            >
              <Quote className="w-3.5 h-3.5" />
              <span>{showOriginalText ? 'Hide original legal text' : 'Show original legal text'}</span>
              {showOriginalText ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={handleCopyText}
              className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              title="Copy original legal text"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

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

      {/* Card Action Buttons Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
        <div className="flex items-center gap-2">
          {onViewInDocument && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewInDocument(clause)}
              iconLeft={<Eye className="w-3.5 h-3.5 text-indigo-500" />}
              className="h-8 text-xs font-semibold"
            >
              View in document
            </Button>
          )}

          {onAskAI && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAskAI(clause)}
              iconLeft={<MessageSquarePlus className="w-3.5 h-3.5 text-indigo-600" />}
              className="h-8 text-xs text-indigo-600 dark:text-indigo-400"
            >
              Ask AI about this
            </Button>
          )}
        </div>

        <button
          type="button"
          onClick={handleToggleFlag}
          className={`p-1.5 rounded-lg border transition-colors ${
            isFlagged
              ? 'bg-amber-50 border-amber-300 text-amber-600 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-400'
              : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
          title={isFlagged ? 'Unflag clause' : 'Flag for review'}
        >
          <Flag className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
};
