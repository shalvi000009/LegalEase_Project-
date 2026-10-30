import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, Calendar } from 'lucide-react';
import { DateType, ContractDate } from '../../types/dates';

interface AddDateFormProps {
  onAdd: (date: Omit<ContractDate, 'id' | 'docId' | 'userConfirmed' | 'isActive'>) => void;
  onCancel: () => void;
}

const DATE_TYPES: DateType[] = [
  'expiry_date',
  'renewal_date',
  'notice_deadline',
  'payment_due',
  'probation_end',
  'lock_in_end',
  'other',
];

export const AddDateForm: React.FC<AddDateFormProps> = ({ onAdd, onCancel }) => {
  const [dateType, setDateType] = useState<DateType>('expiry_date');
  const [resolvedDate, setResolvedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [rawText, setRawText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedDate) return;

    onAdd({
      dateType,
      resolvedDate,
      rawText: rawText.trim() || 'Manually added date',
      confidence: 1.0,
    });
  };

  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      onSubmit={handleSubmit}
      className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-indigo-200 dark:border-indigo-500/30 space-y-3.5 shadow-sm"
    >
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Add Custom Contract Date
            </span>
            <button
              type="button"
              onClick={onCancel}
              className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Date Category
                </label>
                <select
                  value={dateType}
                  onChange={(e) => setDateType(e.target.value as DateType)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm cursor-pointer"
                >
                  {DATE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace(/_/g, ' ').toUpperCase()}
                    </option>
                  ))}
                </select>
            </div>

            <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Target Date
                </label>
                <input
                  type="date"
                  required
                  value={resolvedDate}
                  onChange={(e) => setResolvedDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
                />
            </div>
          </div>

          <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Reference Clause / Extract (Optional)
              </label>
              <input
                type="text"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="e.g., Clause 4.2 - Payment due within 30 days"
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
              />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/25 transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Date
            </button>
          </div>
        </motion.form>
        );
};
