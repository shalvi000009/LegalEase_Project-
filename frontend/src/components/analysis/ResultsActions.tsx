import React from 'react';
import { Download, Share2, MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';

export interface ResultsActionsProps {
  onDownloadReport?: () => void;
  onShareAnalysis?: () => void;
  onAskAI?: () => void;
}

export const ResultsActions: React.FC<ResultsActionsProps> = ({
  onDownloadReport,
  onShareAnalysis,
  onAskAI,
}) => {
  const handleDownload = () => {
    if (onDownloadReport) onDownloadReport();
    else toast.success('Report download started (PDF export)');
  };

  const handleShare = () => {
    if (onShareAnalysis) onShareAnalysis();
    else {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href);
        toast.success('Analysis link copied to clipboard!');
      } else {
        toast.success('Analysis link ready to share');
      }
    }
  };

  return (
    <div className="sticky bottom-4 z-40 max-w-5xl mx-auto w-full px-2 sm:px-0">
      <div className="bg-slate-900/90 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-800 p-4 rounded-3xl shadow-2xl shadow-indigo-950/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>Export or collaborate on this contract analysis</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={onAskAI}
            className="w-full sm:w-auto text-indigo-300 hover:text-white hover:bg-indigo-950/50 border border-indigo-800/40"
            iconLeft={<MessageSquare className="w-4 h-4 text-indigo-400" />}
          >
            Ask AI Assistant
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleShare}
            className="w-full sm:w-auto"
            iconLeft={<Share2 className="w-4 h-4" />}
          >
            Share Analysis
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleDownload}
            className="w-full sm:w-auto shadow-lg shadow-indigo-500/20"
            iconLeft={<Download className="w-4 h-4" />}
          >
            Download Report (PDF)
          </Button>
        </div>
      </div>
    </div>
  );
};
