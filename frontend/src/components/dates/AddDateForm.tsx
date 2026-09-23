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
      className="p-4 rounded-xl bg-slate-900/90 border border-indigo-500/30 space-y-3"
    >
      <div className="flex items-center justify-between pb-1 border-b border-slate-800">
        <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          Add Custom Contract Date
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="text-slate-400 hover:text-white p-1 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-medium text-slate-300 mb-1">
            Date Category
          </label>
          <select
            value={dateType}
            onChange={(e) => setDateType(e.target.value as DateType)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            {DATE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, ' ').toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-300 mb-1">
            Target Date
          </label>
          <input
            type="date"
            required
            value={resolvedDate}
            onChange={(e) => setResolvedDate(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-medium text-slate-300 mb-1">
          Reference Clause / Extract (Optional)
        </label>
        <input
          type="text"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="e.g., Clause 4.2 - Payment due within 30 days"
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Date
        </button>
      </div>
    </motion.form>
  );
};
