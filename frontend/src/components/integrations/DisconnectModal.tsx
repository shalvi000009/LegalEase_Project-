import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Unlink, X } from 'lucide-react';

interface DisconnectModalProps {
  isOpen: boolean;
  providerTitle?: string;
  accountEmail?: string;
  onClose: () => void;
  onConfirm: () => void;
  isDisconnecting?: boolean;
}

export const DisconnectModal: React.FC<DisconnectModalProps> = ({
  isOpen,
  providerTitle = 'Account',
  accountEmail,
  onClose,
  onConfirm,
  isDisconnecting = false,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Warning Header */}
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/60 text-amber-500">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Disconnect {providerTitle}?
              </h3>
              {accountEmail && (
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[220px]">
                  {accountEmail}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              Are you sure? Disconnecting will stop LegalEase from auto-scanning your account for new contract attachments and renewal dates.
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Existing scanned contracts in your vault will remain saved.
            </p>
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
            <motion.button
              type="button"
              onClick={onConfirm}
              disabled={isDisconnecting}
              whileHover={{ x: [0, -3, 3, -3, 3, 0] }}
              transition={{ duration: 0.4 }}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-lg shadow-rose-500/25 transition-all disabled:opacity-50"
            >
              <Unlink className="w-4 h-4" />
              <span>{isDisconnecting ? 'Disconnecting...' : 'Disconnect'}</span>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
