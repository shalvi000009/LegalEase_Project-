import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Calendar, Layers, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AnalysisResult } from '../../types/analysis';

export interface ResultsHeaderProps {
  analysis: AnalysisResult;
}

export const ResultsHeader: React.FC<ResultsHeaderProps> = ({ analysis }) => {
  const navigate = useNavigate();

  const formattedDate = new Date(analysis.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
      {/* Top Nav Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/documents')}
          iconLeft={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Documents
        </Button>

        <div className="flex items-center gap-2">
          <Badge variant="success" size="md">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 inline" /> Analysis Complete
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/upload')}
            iconLeft={<Sparkles className="w-3.5 h-3.5 text-indigo-500" />}
          >
            Analyze New Contract
          </Button>
        </div>
      </div>

      {/* Document Info Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 shadow-xs">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {analysis.filename || 'Contract Analysis Report'}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span className="flex items-center gap-1 font-mono">
                ID: {analysis.doc_id.substring(0, 16)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {formattedDate}
              </span>
              {analysis.page_count && (
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  {analysis.page_count} {analysis.page_count === 1 ? 'Page' : 'Pages'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
