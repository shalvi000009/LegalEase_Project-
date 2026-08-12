import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';
import { RiskLevel } from '../../types/analysis';

export interface RiskBadgeProps {
  level: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
  showScore?: number;
  className?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level,
  size = 'md',
  showScore,
  className = '',
}) => {
  let bgClasses = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
  let Icon = ShieldCheck;
  let label = 'Low Risk';

  if (level === 'high') {
    bgClasses = 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border-red-300 dark:border-red-800';
    Icon = ShieldAlert;
    label = 'High Risk';
  } else if (level === 'medium') {
    bgClasses = 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800';
    Icon = AlertTriangle;
    label = 'Medium Risk';
  }

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px] gap-1'
      : size === 'lg'
      ? 'px-3.5 py-1.5 text-sm gap-2'
      : 'px-2.5 py-1 text-xs gap-1.5';

  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={`inline-flex items-center font-bold rounded-full border shadow-xs ${bgClasses} ${sizeClasses} ${className}`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
      <span>{label}</span>
      {typeof showScore === 'number' && (
        <span className="font-mono text-[10px] opacity-80 pl-0.5">({showScore})</span>
      )}
    </motion.span>
  );
};
