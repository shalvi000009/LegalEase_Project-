import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, CheckCircle2, Plus, ArrowRight, X } from 'lucide-react';
import { ContractDate } from '../../types/dates';
import { DateRow } from './DateRow';
import { AddDateForm } from './AddDateForm';

interface DateConfirmationModalProps {
  isOpen: boolean;
  docTitle?: string;
  dates: ContractDate[];
  onConfirmDate: (dateId: string) => void;
  onConfirmAll: () => void;
  onUpdateDate: (dateId: string, updated: Partial<ContractDate>) => void;
  onDeleteDate: (dateId: string) => void;
  onAddDate: (date: Omit<ContractDate, 'id' | 'docId' | 'userConfirmed' | 'isActive'>) => void;
  onClose: () => void;
  onProceed: () => void;
}

export const DateConfirmationModal: React.FC<DateConfirmationModalProps> = ({
  isOpen,
  docTitle = 'Contract Document',
  dates,
  onConfirmDate,
  onConfirmAll,
  onUpdateDate,
  onDeleteDate,
  onAddDate,
  onClose,
  onProceed,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);

  if (!isOpen) return null;

  const confirmedCount = dates.filter((d) => d.userConfirmed).length;
  const totalCount = dates.length;
  const progressPercent = totalCount > 0 ? Math.round((confirmedCount / totalCount) * 100) : 0;

  return (
    <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-start justify-between">
                <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 shadow-sm">
                          <Calendar className="w-5 h-5" />
                        </span>
                        <div>
                            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Review Important Dates</h2>
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                              Extracted dates for <span className="text-slate-900 dark:text-slate-200 font-bold">{docTitle}</span>. Please review and confirm.
                            </p>
                        </div>
                      </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Progress Bar */}
                  <div className="px-5 py-3 bg-slate-100/70 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                        <span className="text-slate-700 dark:text-slate-300 font-bold">
                          {confirmedCount} of {totalCount} dates confirmed
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-black">{progressPercent}% verified</span>
                    </div>

                    {confirmedCount < totalCount && (
                      <button
                        onClick={onConfirmAll}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 flex items-center gap-1 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Confirm All
                      </button>
                    )}
                  </div>

                    <div className="h-1 bg-slate-200 dark:bg-slate-800 w-full overflow-hidden">
                      <motion.div
                        className="h-full bg-emerald-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>

                    {/* Body: Dates list */}
                    <div className="p-5 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
                      {dates.length === 0 && !showAddForm ? (
                        <div className="py-8 text-center space-y-2">
                          <Calendar className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
                          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No dates extracted from this contract yet.</p>
                          <button
                            onClick={() => setShowAddForm(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-600/20"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Date Manually
                          </button>
                        </div>
                      ) : (
                        dates.map((d) => (
                          <DateRow
                            key={d.id}
                            date={d}
                            onConfirm={onConfirmDate}
                            onUpdate={onUpdateDate}
                            onDelete={onDeleteDate}
                          />
                        ))
                      )}

                      {/* Add Date Form */}
                      {showAddForm && (
                        <AddDateForm
                          onAdd={(newDate) => {
                            onAddDate(newDate);
                            setShowAddForm(false);
                          }}
                          onCancel={() => setShowAddForm(false)}
                        />
                      )}
                    </div>

                    {/* Footer */}
                      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 flex items-center justify-between gap-3">
                        {!showAddForm && (
                          <button
                            onClick={() => setShowAddForm(true)}
                            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                          >
                            <Plus className="w-4 h-4" />
                            Add Missed Date
                          </button>
                        )}

                        <div className="flex items-center gap-2.5 ml-auto">
                          <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-xs font-bold transition-colors"
                          >
                            I'll review later
                          </button>
                          <button
                            onClick={onProceed}
                            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/25 transition-all active:scale-95"
                          >
                            <span>Continue to Results</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </AnimatePresence>
                );
};
