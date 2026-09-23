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
    colorClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  },
  renewal_date: {
    label: 'Renewal Date',
    icon: CalendarCheck,
    colorClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  notice_deadline: {
    label: 'Notice Deadline',
    icon: Clock,
    colorClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  },
  payment_due: {
    label: 'Payment Due',
    icon: CreditCard,
    colorClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  },
  probation_end: {
    label: 'Probation End',
    icon: UserCheck,
    colorClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  },
  lock_in_end: {
    label: 'Lock-in Period',
    icon: Lock,
    colorClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  },
  other: {
    label: 'Contract Date',
    icon: Calendar,
    colorClass: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
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
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.colorClass} ${className}`}
    >
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      <span>{config.label}</span>
    </span>
  );
};
