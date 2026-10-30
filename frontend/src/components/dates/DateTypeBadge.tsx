import React from 'react';
import {
  CalendarX,
  CalendarCheck,
  Clock,
  CreditCard,
  UserCheck,
  Lock,
  Calendar
} from 'lucide-react';
import { DateType } from '../../types/dates';

interface DateTypeBadgeProps {
  type: DateType;
  className?: string;
  showIcon?: boolean;
}

const TYPE_CONFIG: Record<DateType, { label: string; icon: React.ElementType; colorClass: string }> = {
  expiry_date: {
    label: 'Expiry Date',
    icon: CalendarX,
    colorClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
  },
  renewal_date: {
    label: 'Renewal Date',
    icon: CalendarCheck,
    colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
  },
  notice_deadline: {
    label: 'Notice Deadline',
    icon: Clock,
    colorClass: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
  },
  payment_due: {
    label: 'Payment Due',
    icon: CreditCard,
    colorClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30',
  },
  probation_end: {
    label: 'Probation End',
    icon: UserCheck,
    colorClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30',
  },
  lock_in_end: {
    label: 'Lock-in Period',
    icon: Lock,
    colorClass: 'bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30',
  },
  other: {
    label: 'Contract Date',
    icon: Calendar,
    colorClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700',
  },
};

export const DateTypeBadge: React.FC<DateTypeBadgeProps> = ({
  type,
  className = '',
  showIcon = true
}) => {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.other;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-sm transition-colors ${config.colorClass} ${className}`}
    >
      {showIcon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span>{config.label}</span>
    </span>
  );
};
