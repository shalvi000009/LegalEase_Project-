import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, CheckCircle2, FileCheck, UserCheck, Shield } from 'lucide-react';
import { AnalysisResult } from '../../types/analysis';

export interface SummaryCardProps {
  analysis: AnalysisResult;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ analysis }) => {

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
      {/* Header Badge */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
          <Sparkles className="w-4 h-4" /> AI Plain-English Contract Summary
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Processed in {(analysis.processing_time_ms / 1000).toFixed(1)}s
        </span>
      </div>

      {/* Main Executive Summary */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-indigo-500" />
          Executive Overview
        </h3>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-indigo-50/50 dark:bg-indigo-950/30 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
          {analysis.summary}
        </p>
      </div>

      {/* Key Obligations Section */}
      {analysis.key_obligations && analysis.key_obligations.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-500" />
            Your Key Obligations ({analysis.key_obligations.length})
          </h3>

          <ul className="space-y-2">
            {analysis.key_obligations.map((ob, idx) => (
              <motion.li
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{ob}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      {/* Other Obligations (if available) */}
      {analysis.other_obligations && analysis.other_obligations.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Shield className="w-4 h-4 text-sky-500" />
            Other Party Obligations ({analysis.other_obligations.length})
          </h3>

          <ul className="space-y-2">
            {analysis.other_obligations.map((ob, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800"
              >
                <span className="w-2 h-2 rounded-full bg-sky-500 flex-shrink-0 mt-1.5" />
                <span>{ob}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
