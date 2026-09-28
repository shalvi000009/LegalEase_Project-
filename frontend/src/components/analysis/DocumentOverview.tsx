import React from 'react';
import { FileText, Calendar, HardDrive, ShieldAlert, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { AnalysisResult } from '../../types/analysis';
import { RiskScoreGauge } from './RiskScoreGauge';

interface DocumentOverviewProps {
  analysis: AnalysisResult;
}

export const DocumentOverview: React.FC<DocumentOverviewProps> = ({ analysis }) => {
  const clauses = analysis.red_flags || [];
  const highRiskCount = clauses.filter((c) => c.risk_level === 'high').length;
  const medRiskCount = clauses.filter((c) => c.risk_level === 'medium').length;
  const lowRiskCount = clauses.filter((c) => c.risk_level === 'low').length;

  const formattedDate = analysis.created_at
    ? new Date(analysis.created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Aug 12, 2026';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      {/* Top Title & Metadata */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="space-y-1 min-w-0 flex-1">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
            {analysis.filename || 'Master_Services_Agreement.pdf'}
          </h2>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              {formattedDate}
            </span>
            <span>•</span>
            <span>{analysis.page_count || 3} pages</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-slate-400" />
              2.4 MB
            </span>
          </div>
        </div>

        {/* Mini Risk Gauge */}
        <div className="shrink-0 scale-75 origin-top-right -mt-2 -mr-2">
          <RiskScoreGauge score={analysis.risk_score} riskLevel={analysis.risk_level} />
        </div>
      </div>

      {/* Quick Risk Stats Counter Grid */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Clauses
          </span>
          <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 font-mono">
            {clauses.length}
          </span>
        </div>

        <div className="bg-red-50/70 dark:bg-red-950/40 p-2.5 rounded-xl border border-red-100 dark:border-red-900/40 text-center">
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider flex items-center justify-center gap-1">
            <ShieldAlert className="w-3 h-3" /> High
          </span>
          <span className="text-base font-extrabold text-red-600 dark:text-red-400 font-mono">
            {highRiskCount}
          </span>
        </div>

        <div className="bg-amber-50/70 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-100 dark:border-amber-900/40 text-center">
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider flex items-center justify-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Med
          </span>
          <span className="text-base font-extrabold text-amber-600 dark:text-amber-400 font-mono">
            {medRiskCount}
          </span>
        </div>

        <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-center">
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Low
          </span>
          <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
            {lowRiskCount}
          </span>
        </div>
      </div>
    </div>
  );
};
