import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ExternalLink, X, Lock } from 'lucide-react';
import { IntegrationProvider } from '../../types/integrations';

interface ConnectModalProps {
  isOpen: boolean;
  provider: IntegrationProvider | null;
  onClose: () => void;
  onConfirm: () => void;
  isConnecting?: boolean;
}

export const ConnectModal: React.FC<ConnectModalProps> = ({
  isOpen,
  provider,
  onClose,
  onConfirm,
  isConnecting = false,
}) => {
  if (!isOpen || !provider) return null;

  const title = provider === 'gmail' ? 'Connect Gmail Account' : 'Connect Google Drive';
  const providerName = provider === 'gmail' ? 'Gmail' : 'Google Drive';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Auto-scan agreement attachments & cloud contract folders
              </p>
            </div>
          </div>

          {/* Security & Scope Explanation */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
            <div className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                You will be redirected to Google to authorize secure OAuth 2.0 access. LegalEase only inspects legal document attachments (.pdf, .docx).
              </p>
            </div>
            <ul className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1.5 pl-6 list-disc">
              <li>Read-only access to inspect contract email attachments</li>
              <li>Auto-extraction of renewal dates & liability clauses</li>
              <li>You can disconnect access anytime from Settings</li>
            </ul>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isConnecting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50"
            >
              <span>{isConnecting ? 'Opening Google...' : `Authorize ${providerName}`}</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
