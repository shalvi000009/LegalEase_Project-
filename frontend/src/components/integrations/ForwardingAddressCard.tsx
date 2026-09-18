import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Forward, Copy, Check, Mail, Info } from 'lucide-react';
import toast from 'react-hot-toast';

interface ForwardingAddressCardProps {
  address?: string;
}

export const ForwardingAddressCard: React.FC<ForwardingAddressCardProps> = ({
  address = 'yourname@docs.legalease.in',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    toast.success('Forwarding email address copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none flex flex-col justify-between relative overflow-hidden"
    >
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-amber-500 blur-3xl opacity-10 pointer-events-none" />

      <div>
        {/* Header Icon & Title */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/40 flex items-center justify-center">
              <Forward className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Email Forwarding
              </h3>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Direct Inbound Processing
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Ready
          </span>
        </div>

        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 mb-4">
          Forward any legal contract email or agreement PDF directly to your unique LegalEase inbound email address for instant auto-scanning.
        </p>

        {/* Read-only Address Input & Copy Button */}
        <div className="space-y-2 mb-4">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Your Forwarding Email Address
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                readOnly
                value={address}
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none select-all"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 text-xs font-bold transition-all ${
                copied
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="flex items-start gap-2 p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-200">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-snug">
            <strong>Tip:</strong> Set up an automated auto-forwarding filter in Outlook, Apple Mail, or Gmail to route all emails containing &quot;Agreement&quot; or &quot;Contract&quot;.
          </p>
        </div>
      </div>
    </motion.div>
  );
};
