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
      color: 'from-blue-500/20 to-indigo-500/10 text-blue-400 border-blue-500/30',
      badge: 'In Vault',
    },
    {
      title: 'Active Contracts',
      value: stats.active,
      icon: CheckCircle2,
      color: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30',
      badge: 'Compliant',
    },
    {
      title: 'Expiring Soon',
      value: stats.expiringSoon,
      icon: Clock,
      color: stats.expiringSoon > 0 
        ? 'from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/40 ring-1 ring-amber-500/30' 
        : 'from-slate-800/40 to-slate-900/40 text-slate-400 border-slate-800',
      badge: '< 30 Days',
    },
    {
      title: 'Expired Contracts',
      value: stats.expired,
      icon: AlertTriangle,
      color: stats.expired > 0 
        ? 'from-rose-500/20 to-red-500/10 text-rose-400 border-rose-500/40 ring-1 ring-rose-500/30' 
        : 'from-slate-800/40 to-slate-900/40 text-slate-400 border-slate-800',
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
            transition={{ duration: 0.3, delay: i * 0.08 }}
            className={`p-4 rounded-2xl bg-gradient-to-br border backdrop-blur-xl flex flex-col justify-between ${c.color}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                {c.title}
              </span>
              <span className="p-2 rounded-xl bg-slate-950/40 border border-white/5">
                <Icon className="w-4 h-4" />
              </span>
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <motion.span
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                className="text-3xl font-black text-white tracking-tight"
              >
                {c.value}
              </motion.span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-950/50 border border-white/10 text-slate-300">
                {c.badge}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
