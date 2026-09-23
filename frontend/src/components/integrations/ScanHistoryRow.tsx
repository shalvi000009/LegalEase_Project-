import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Mail,
  HardDrive,
  Forward,
  ChevronDown,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Sparkles,
  Search,
  Filter,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { ScanLogEntry, ScanAction } from '../../types/integrations';

interface ScanHistoryRowProps {
  entry: ScanLogEntry;
}

const ACTION_CONFIG: Record<
  ScanAction,
  { label: string; bg: string; text: string; border: string; icon: React.ElementType }
> = {
  detected: {
    label: 'Detected',
    bg: 'bg-blue-50 dark:bg-blue-950/60',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800/60',
    icon: Search,
  },
  classified: {
    label: 'Classified',
    bg: 'bg-purple-50 dark:bg-purple-950/60',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800/60',
    icon: Sparkles,
  },
  deduplicated: {
    label: 'Deduplicated',
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
    icon: Filter,
  },
  analyzed: {
    label: 'Analyzed',
    bg: 'bg-emerald-50 dark:bg-emerald-950/60',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800/60',
    icon: CheckCircle,
  },
  skipped: {
    label: 'Skipped',
    bg: 'bg-amber-50 dark:bg-amber-950/60',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800/60',
    icon: AlertCircle,
  },
  failed: {
    label: 'Failed',
    bg: 'bg-rose-50 dark:bg-rose-950/60',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800/60',
    icon: XCircle,
  },
};

export const ScanHistoryRow: React.FC<ScanHistoryRowProps> = ({ entry }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();

  const actionInfo = ACTION_CONFIG[entry.action] || ACTION_CONFIG.detected;
  const ActionIcon = actionInfo.icon;

  const getSourceIcon = () => {
    if (entry.sourceRef.startsWith('msg')) return Mail;
    if (entry.sourceRef.startsWith('drive')) return HardDrive;
    return Forward;
  };

  const SourceIcon = getSourceIcon();
  const scorePercent = Math.round((entry.classifierScore || 0) * 100);

  const getScoreColor = (score?: number) => {
    if (!score) return 'bg-slate-300 dark:bg-slate-700';
    if (score >= 0.7) return 'bg-emerald-500';
    if (score >= 0.4) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const formattedDate = formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true });
  const exactDate = format(new Date(entry.createdAt), 'PPP pp');

  const handleRowClick = (e: React.MouseEvent) => {
    // Don't expand if click was on action link
    const target = e.target as HTMLElement;
    if (target.closest('button.view-doc-btn')) return;
    setIsExpanded(!isExpanded);
  };

  return (
    <motion.div
      layout
      className="border-b border-slate-100 dark:border-slate-800/80 last:border-b-0"
    >
      <div
        onClick={handleRowClick}
        className="grid grid-cols-12 items-center px-4 py-3.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer text-xs select-none gap-2 sm:gap-4"
      >
        {/* Source Name & Icon */}
        <div className="col-span-5 sm:col-span-4 flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
            <SourceIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
              {entry.sourceName}
            </p>
            <p className="text-[10px] text-slate-400 font-mono truncate">{entry.sourceRef}</p>
          </div>
        </div>

        {/* Action Badge */}
        <div className="col-span-3 sm:col-span-3">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${actionInfo.bg} ${actionInfo.text} ${actionInfo.border}`}
          >
            <ActionIcon className="w-3 h-3 shrink-0" />
            <span className="capitalize">{actionInfo.label}</span>
          </span>
        </div>

        {/* Classifier Score */}
        <div className="hidden sm:flex col-span-3 items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden max-w-[100px]">
            <div
              className={`h-full rounded-full transition-all duration-300 ${getScoreColor(
                entry.classifierScore
              )}`}
              style={{ width: `${scorePercent}%` }}
            />
          </div>
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 w-9 text-right font-mono">
            {scorePercent}%
          </span>
        </div>

        {/* Time & Expand Indicator */}
        <div className="col-span-4 sm:col-span-2 flex items-center justify-end gap-2 text-right">
          <div className="hidden md:block">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate" title={exactDate}>
              {formattedDate}
            </p>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </div>
      </div>

      {/* Accordion Expandable Details Drawer */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-slate-50/70 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 px-6 py-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Log ID & Timestamp
                </p>
                <p className="font-mono text-slate-700 dark:text-slate-300 text-[11px]">{entry.id}</p>
                <div className="flex items-center gap-1.5 mt-1 text-slate-500 dark:text-slate-400 text-[11px]">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{exactDate}</span>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Details & Execution
                </p>
                <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                  {entry.details || 'Document processed according to legal agreement classifier rules.'}
                </p>
              </div>

              <div className="flex flex-col justify-between items-start md:items-end">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Contract Match Confidence
                  </p>
                  <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                    {scorePercent}% confidence
                  </p>
                </div>

                {entry.docId && (
                  <button
                    type="button"
                    onClick={() => navigate(`/documents/${entry.docId}`)}
                    className="view-doc-btn mt-3 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold shadow-sm transition-all"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Document Analysis</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
