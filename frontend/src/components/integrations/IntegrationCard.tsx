import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, Unlink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface IntegrationCardProps {
  provider: 'gmail' | 'google_drive' | 'inbound_email';
  icon: LucideIcon;
  title: string;
  description: string;
  status: 'active' | 'inactive' | 'error';
  accountEmail?: string;
  lastScanned?: string;
  onConnect: () => void;
  onDisconnect: () => void;
  isLoading?: boolean;
  accentColor?: string;
}

export const IntegrationCard: React.FC<IntegrationCardProps> = ({
  provider,
  icon: Icon,
  title,
  description,
  status,
  accountEmail,
  lastScanned,
  onConnect,
  onDisconnect,
  isLoading = false,
}) => {
  const isConnected = status === 'active';

  const formattedLastScanned = lastScanned
    ? formatDistanceToNow(new Date(lastScanned), { addSuffix: true })
    : null;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none flex flex-col justify-between relative overflow-hidden"
    >
      {/* Dynamic Background Accent Gradient */}
      <div
        className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 pointer-events-none ${
          provider === 'gmail'
            ? 'bg-red-500'
            : provider === 'google_drive'
            ? 'bg-blue-500'
            : 'bg-amber-500'
        }`}
      />

      <div>
        {/* Header Badge & Icon */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-3.5 rounded-2xl flex items-center justify-center ${
                provider === 'gmail'
                  ? 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-800/40'
                  : provider === 'google_drive'
                  ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/40'
                  : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/40'
              }`}
            >
              <Icon className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {title}
              </h3>
              {isConnected && accountEmail ? (
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                  {accountEmail}
                </p>
              ) : (
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Not connected</p>
              )}
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-1.5">
            {status === 'active' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            )}
            {status === 'inactive' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                Inactive
              </span>
            )}
            {status === 'error' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-[11px] font-bold">
                <AlertTriangle className="w-3 h-3 text-rose-500" />
                Needs Attention
              </span>
            )}
          </div>
        </div>

        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 mb-4">
          {description}
        </p>

        {/* Sync Info */}
        {isConnected && (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 text-[11px] text-slate-500 dark:text-slate-400 mb-4">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Auto-Scan Enabled
            </span>
            {formattedLastScanned && (
              <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300">
                <RefreshCw className="w-3 h-3 text-slate-400" />
                {formattedLastScanned}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="pt-2">
        {isConnected ? (
          <button
            type="button"
            onClick={onDisconnect}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-bold transition-all disabled:opacity-50"
          >
            <Unlink className="w-3.5 h-3.5" />
            <span>Disconnect Account</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onConnect}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Connect {title}</span>
              </>
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
};
