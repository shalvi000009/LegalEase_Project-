import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Share2,
  Copy,
  Check,
  Globe,
  Clock,
  QrCode,
  Mail,
  MessageCircle,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { ShareLink } from '../../types/report';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareLink: ShareLink | null;
  isLoading?: boolean;
  onRevoke?: (linkId: string) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  shareLink,
  isLoading = false,
  onRevoke,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [showQr, setShowQr] = React.useState(false);

  if (!isOpen) return null;

  const copyUrl = shareLink?.url || window.location.href;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(copyUrl);
      } else {
        const ta = document.createElement('textarea');
        ta.value = copyUrl;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'LegalEase Contract Analysis Report',
          text: 'Check out this automated AI legal contract risk analysis:',
          url: copyUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopy();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/80">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Share Contract Analysis
                </h3>
                <p className="text-[11px] text-slate-500">Generate read-only public access link</p>
              </div>
            </div>

            <Button variant="ghost" size="xs" onClick={onClose} className="text-slate-400">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-5">
            {isLoading ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                <p className="text-xs text-slate-500 font-medium">Generating secure share token...</p>
              </div>
            ) : (
              <>
                {/* Link Copy Box */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Public Shareable Link
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={copyUrl}
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none select-all"
                    />
                    <Button
                      size="sm"
                      onClick={handleCopy}
                      iconLeft={copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      className={copied ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                </div>

                {/* Status & Expiry Note */}
                <div className="flex items-center justify-between text-xs text-slate-500 bg-indigo-50/50 dark:bg-indigo-950/40 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/60">
                  <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                    <Globe className="w-4 h-4 shrink-0" />
                    <span className="font-medium">Anyone with link can view</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Expires in 7 days</span>
                  </div>
                </div>

                {/* Quick Share Buttons */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    onClick={handleWebShare}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 transition-colors text-xs font-medium text-slate-700 dark:text-slate-300 gap-1.5"
                  >
                    <Mail className="w-4 h-4 text-indigo-500" />
                    <span>Email Share</span>
                  </button>

                  <button
                    onClick={() => {
                      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`Check LegalEase analysis: ${copyUrl}`)}`;
                      window.open(waUrl, '_blank');
                    }}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-600 transition-colors text-xs font-medium text-slate-700 dark:text-slate-300 gap-1.5"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-500" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    onClick={() => setShowQr(!showQr)}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-violet-50 dark:hover:bg-violet-950/60 hover:text-violet-600 transition-colors text-xs font-medium text-slate-700 dark:text-slate-300 gap-1.5"
                  >
                    <QrCode className="w-4 h-4 text-violet-500" />
                    <span>{showQr ? 'Hide QR' : 'Show QR'}</span>
                  </button>
                </div>

                {/* QR Code Display */}
                {showQr && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2"
                  >
                    {/* SVG Mock QR pattern */}
                    <div className="w-32 h-32 bg-white p-2 rounded-lg shadow-inner flex items-center justify-center">
                      <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900 fill-current">
                        <rect x="10" y="10" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="6" />
                        <rect x="16" y="16" width="13" height="13" />
                        <rect x="65" y="10" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="6" />
                        <rect x="71" y="16" width="13" height="13" />
                        <rect x="10" y="65" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="6" />
                        <rect x="16" y="71" width="13" height="13" />
                        <rect x="45" y="45" width="10" height="10" />
                        <rect x="60" y="45" width="12" height="12" />
                        <rect x="45" y="60" width="15" height="15" />
                        <rect x="65" y="65" width="20" height="20" />
                      </svg>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">Scan to open on mobile device</span>
                  </motion.div>
                )}

                {/* Revoke Action */}
                {onRevoke && shareLink && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => onRevoke(shareLink.id)}
                      className="text-rose-500 hover:text-rose-600 text-xs"
                      iconLeft={<Trash2 className="w-3.5 h-3.5" />}
                    >
                      Revoke Link
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
