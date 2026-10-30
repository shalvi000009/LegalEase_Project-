import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Clock, CheckCircle2, ChevronDown } from 'lucide-react';
import { Reminder } from '../../types/dates';
import { DateTypeBadge } from '../dates/DateTypeBadge';

interface ReminderListProps {
  reminders: Reminder[];
  onSnooze: (id: string, days: number) => void;
  onResolve: (id: string) => void;
}

export const ReminderList: React.FC<ReminderListProps> = ({
  reminders,
  onSnooze,
  onResolve,
}) => {
  const [openSnoozeId, setOpenSnoozeId] = useState<string | null>(null);

  // Group reminders by timeframe
  const grouped = {
    today: reminders.filter((r) => r.daysBefore <= 1),
    thisWeek: reminders.filter((r) => r.daysBefore > 1 && r.daysBefore <= 7),
    thisMonth: reminders.filter((r) => r.daysBefore > 7 && r.daysBefore <= 30),
    later: reminders.filter((r) => r.daysBefore > 30),
  };

  const snoozeOptions = [
    { label: '1 Day', days: 1 },
    { label: '3 Days', days: 3 },
    { label: '7 Days', days: 7 },
    { label: '30 Days', days: 30 },
  ];

  const renderGroup = (title: string, groupReminders: Reminder[], badgeColor: string) => {
    if (groupReminders.length === 0) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${badgeColor}`} />
            <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-300 uppercase tracking-wider">{title}</h4>
            <span className="text-[11px] font-bold text-slate-700 bg-slate-100 dark:text-slate-300 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
              {groupReminders.length}
            </span>
        </div>

          <div className="space-y-2.5">
            {groupReminders.map((rem) => (
              <motion.div
                key={rem.id}
                layout
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.05)] dark:shadow-none hover:border-indigo-300 dark:hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
              >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {rem.dateType && <DateTypeBadge type={rem.dateType} />}
                        <span className="text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-200 dark:border-amber-500/20 shadow-sm">
                          {rem.daysBefore <= 0 ? 'Due Today' : `In ${rem.daysBefore} days`}
                        </span>
                        {rem.status === 'snoozed' && (
                    <span className="text-[11px] font-bold text-cyan-800 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-500/10 px-2.5 py-0.5 rounded-md border border-cyan-200 dark:border-cyan-500/20 shadow-sm">
                      Snoozed until {rem.snoozedUntil}
                    </span>
                  )}
                </div>

                <h5 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {rem.contractName || 'Contract Deadline'}
                </h5>

                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium flex items-center gap-2">
                  <span>Scheduled for: <strong className="text-slate-800 dark:text-slate-200">{rem.scheduledFor}</strong></span>
                  {rem.resolvedDate && <span>• Expiry: <strong className="text-slate-800 dark:text-slate-200">{rem.resolvedDate}</strong></span>}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                {/* Snooze Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setOpenSnoozeId(openSnoozeId === rem.id ? null : rem.id)}
                    className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                  >
                    <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    Snooze
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {openSnoozeId === rem.id && (
                    <div className="absolute right-0 mt-1.5 z-20 w-32 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1 overflow-hidden">
                      {snoozeOptions.map((opt) => (
                        <button
                          key={opt.days}
                          onClick={() => {
                            onSnooze(rem.id, opt.days);
                            setOpenSnoozeId(null);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-600 dark:hover:text-white transition-colors"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Resolve Button */}
                <button
                  onClick={() => onResolve(rem.id)}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-600/20 dark:hover:bg-emerald-600/30 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Resolve
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
                    );
  };

                    if (reminders.length === 0) {
    return (
                        <div className="py-14 text-center bg-white dark:bg-slate-900/40 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-3">
                          <div className="p-3 w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20 mx-auto flex items-center justify-center shadow-sm">
                            <Bell className="w-6 h-6" />
                          </div>
                            <h4 className="text-base font-extrabold text-slate-900 dark:text-white">No Upcoming Reminders</h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto font-medium">
                              All your contract deadlines and notice windows are up to date!
                            </p>
                        </div>
                        );
  }

                        return (
                        <div className="space-y-6">
                          {renderGroup('Today', grouped.today, 'bg-rose-500')}
                          {renderGroup('This Week', grouped.thisWeek, 'bg-amber-500')}
                          {renderGroup('This Month', grouped.thisMonth, 'bg-emerald-500')}
                          {renderGroup('Later', grouped.later, 'bg-indigo-500')}
                        </div>
                        );
};
