import React from 'react';
import { motion } from 'framer-motion';
import { Bell, ExternalLink, Clock, CheckCircle2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Reminder } from '../../types/dates';
import { DateTypeBadge } from '../dates/DateTypeBadge';

interface ReminderToastProps {
  reminder: Reminder;
  onSnooze: (id: string, days: number) => void;
  onResolve: (id: string) => void;
  onDismiss: () => void;
}

export const ReminderToast: React.FC<ReminderToastProps> = ({
  reminder,
  onSnooze,
  onResolve,
  onDismiss,
}) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className="max-w-md w-full bg-slate-900/95 border border-indigo-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-xl space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
            <Bell className="w-5 h-5" />
          </span>
          <div>
            <h4 className="text-sm font-bold text-white leading-tight">
              {reminder.contractName || 'Contract Deadline Alert'}
            </h4>
            <span className="text-[11px] text-slate-400">
              Scheduled for {reminder.scheduledFor}
            </span>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {reminder.dateType && <DateTypeBadge type={reminder.dateType} />}
        <span className="text-xs font-semibold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
          Due in {reminder.daysBefore} days
        </span>
      </div>

      <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
        <button
          onClick={() => {
            onDismiss();
            if (reminder.contractId) {
              navigate(`/results?id=${reminder.contractId}`);
            }
          }}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center gap-1 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              onSnooze(reminder.id, 3);
              onDismiss();
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium flex items-center gap-1 transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
            Snooze 3d
          </button>
          <button
            onClick={() => {
              onResolve(reminder.id);
              onDismiss();
            }}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-medium flex items-center gap-1 transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Resolve
          </button>
        </div>
      </div>
    </motion.div>
  );
};
