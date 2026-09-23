import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Edit2, Trash2, X, AlertTriangle, ShieldCheck } from 'lucide-react';
import { ContractDate, DateType } from '../../types/dates';
import { DateTypeBadge } from './DateTypeBadge';

interface DateRowProps {
  date: ContractDate;
  onConfirm: (dateId: string) => void;
  onUpdate: (dateId: string, updated: Partial<ContractDate>) => void;
  onDelete: (dateId: string) => void;
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

export const DateRow: React.FC<DateRowProps> = ({
  date,
  onConfirm,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editDate, setEditDate] = useState(date.resolvedDate);
  const [editType, setEditType] = useState<DateType>(date.dateType);
  const [editRawText, setEditRawText] = useState(date.rawText);

  const handleSave = () => {
    onUpdate(date.id, {
      resolvedDate: editDate,
      dateType: editType,
      rawText: editRawText,
      userConfirmed: true,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditDate(date.resolvedDate);
    setEditType(date.dateType);
    setEditRawText(date.rawText);
    setIsEditing(false);
  };

  const isHighConfidence = date.confidence >= 0.7;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className={`p-3.5 rounded-xl border transition-all ${
        date.userConfirmed
          ? 'bg-emerald-950/20 border-emerald-500/30'
          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
      }`}
    >
      <AnimatePresence mode="wait">
        {!isEditing ? (
          <motion.div
            key="view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <DateTypeBadge type={date.dateType} />

                {/* Confidence indicator badge */}
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                    isHighConfidence
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}
                  title={`Confidence score: ${Math.round(date.confidence * 100)}%`}
                >
                  {isHighConfidence ? (
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                  )}
                  {Math.round(date.confidence * 100)}% confidence
                </span>

                {date.userConfirmed && (
                  <span className="text-[11px] bg-emerald-500/20 text-emerald-300 font-medium px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Confirmed
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-white tracking-wide">
                  {date.resolvedDate || 'No date set'}
                </span>
                {date.rawText && (
                  <span className="text-xs text-slate-400 italic truncate max-w-md">
                    "{date.rawText}"
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 self-end sm:self-center">
              {!date.userConfirmed && (
                <button
                  onClick={() => onConfirm(date.id)}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium flex items-center gap-1 transition-colors"
                  title="Confirm Date"
                >
                  <Check className="w-3.5 h-3.5" />
                  Confirm
                </button>
              )}

              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Edit Date"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => onDelete(date.id)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors"
                title="Delete Date"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="edit"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Date Type</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as DateType)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {DATE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace(/_/g, ' ').toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Resolved Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Original Text Extract</label>
              <input
                type="text"
                value={editRawText}
                onChange={(e) => setEditRawText(e.target.value)}
                placeholder="Contract snippet context..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={handleCancel}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                Save Changes
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
