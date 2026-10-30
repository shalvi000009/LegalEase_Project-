import React from 'react';
import { motion } from 'framer-motion';
import { FileText, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface VaultStatsProps {
  stats: {
    total: number;
    active: number;
    expiringSoon: number;
    expired: number;
  };
}

export const VaultStats: React.FC<VaultStatsProps> = ({ stats }) => {
  const cards = [
    {
      title: 'Total Contracts',
      value: stats.total,
      icon: FileText,
      accentColor: 'bg-blue-500',
      iconClass: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30',
      badge: 'In Vault',
    },
    {
      title: 'Active Contracts',
      value: stats.active,
      icon: CheckCircle2,
      accentColor: 'bg-emerald-500',
      iconClass: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
      badge: 'Compliant',
    },
    {
      title: 'Expiring Soon',
      value: stats.expiringSoon,
      icon: Clock,
      accentColor: stats.expiringSoon > 0 ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700',
      iconClass: stats.expiringSoon > 0
        ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30'
        : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
      badgeClass: stats.expiringSoon > 0
        ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30 font-bold'
        : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
      badge: '< 30 Days',
    },
    {
      title: 'Expired Contracts',
      value: stats.expired,
      icon: AlertTriangle,
      accentColor: stats.expired > 0 ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-700',
      iconClass: stats.expired > 0
        ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30'
        : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
      badgeClass: stats.expired > 0
        ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30 font-bold'
        : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
      badge: 'Action Needed',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <motion.div
            key={c.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            transition={{ duration: 0.35, delay: i * 0.08 }}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-[0_12px_28px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 flex flex-col justify-between relative overflow-hidden group"
          >
            {/* Top Accent Line */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${c.accentColor}`} />

            <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-wider text-slate-600 dark:text-slate-400 uppercase">
                  {c.title}
                </span>
                  <span className={`p-2.5 rounded-xl border shadow-sm group-hover:scale-110 transition-transform ${c.iconClass}`}>
                    <Icon className="w-4 h-4" />
                  </span>
                </div>

                  <div className="mt-5 flex items-baseline justify-between">
                    <motion.span
                      initial={{ scale: 0.7 }}
                      animate={{ scale: 1 }}
                      className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight"
                    >
                      {c.value}
                    </motion.span>
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-sm ${c.badgeClass}`}>
                        {c.badge}
                      </span>
                  </div>
                </motion.div>
                );
      })}
            </div>
            );
};
