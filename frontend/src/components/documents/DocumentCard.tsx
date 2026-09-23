import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  MoreVertical,
  ExternalLink,
  Share2,
  Download,
  Trash2,
} from 'lucide-react';
import { Document } from '../../types/document';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface DocumentCardProps {
  document: Document;
  onView: (docId: string) => void;
  onDelete: (docId: string) => void;
  onShare: (docId: string) => void;
  onDownloadReport: (docId: string) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onView,
  onDelete,
  onShare,
  onDownloadReport,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const getRiskBadgeColor = (score: number | null) => {
    if (score === null) return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    if (score >= 70) return 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900';
    if (score >= 40) return 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-900';
    return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900';
  };

  const formattedDate = new Date(document.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <Card className="p-5 h-full flex flex-col justify-between relative group hover:shadow-lg transition-all duration-200 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700">
        <div>
          {/* Header row: status & options */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                  {document.fileType.split('/')[1]?.toUpperCase() || 'PDF'}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {(document.fileSize / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center gap-2">
              {document.status === 'processing' || document.status === 'uploading' ? (
                <Badge variant="warning" className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Processing</span>
                </Badge>
              ) : document.status === 'failed' ? (
                <Badge variant="danger" className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Failed</span>
                </Badge>
              ) : (
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Analyzed</span>
                </Badge>
              )}

              {/* Quick Actions Menu */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(!menuOpen);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-30 space-y-0.5">
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onView(document.id);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>View Analysis</span>
                      </button>

                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onShare(document.id);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Share Analysis</span>
                      </button>

                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onDownloadReport(document.id);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </button>

                      <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onDelete(document.id);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Document</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Filename & Date */}
          <div className="mb-4">
            <h3
              onClick={() => onView(document.id)}
              className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              title={document.filename}
            >
              {document.filename}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">Uploaded on {formattedDate}</p>
          </div>
        </div>

        {/* Footer info & Risk Score Gauge */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Risk Score:</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getRiskBadgeColor(document.riskScore)}`}>
              {document.riskScore !== null ? `${document.riskScore}/100` : 'Pending'}
            </span>
          </div>

          <button
            onClick={() => onView(document.id)}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
          >
            View Results &rarr;
          </button>
        </div>
      </Card>
    </motion.div>
  );
};
