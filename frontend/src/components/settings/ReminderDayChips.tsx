import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface ReminderDayChipsProps {
  selectedDays: number[];
  onChange: (days: number[]) => void;
  maxDays?: number;
}

const PRESET_DAYS = [90, 30, 7, 1];

export const ReminderDayChips: React.FC<ReminderDayChipsProps> = ({
  selectedDays,
  onChange,
  maxDays = 10,
}) => {
  const [customInput, setCustomInput] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length === 1) {
        toast.error('At least one reminder day must be selected.');
        return;
      }
      const updated = selectedDays.filter((d) => d !== day).sort((a, b) => b - a);
      onChange(updated);
    } else {
      if (selectedDays.length >= maxDays) {
        toast.error(`Maximum ${maxDays} reminder days allowed.`);
        return;
      }
      const updated = [...selectedDays, day].sort((a, b) => b - a);
      onChange(updated);
    }
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customInput.trim(), 10);
    if (isNaN(val) || val <= 0) {
      toast.error('Please enter a valid number of days (greater than 0).');
      return;
    }
    if (val > 365) {
      toast.error('Custom reminder days cannot exceed 365 days.');
      return;
    }
    if (selectedDays.includes(val)) {
      toast.error(`${val} days reminder is already selected.`);
      return;
    }
    if (selectedDays.length >= maxDays) {
      toast.error(`Maximum ${maxDays} reminder days allowed.`);
      return;
    }

    const updated = [...selectedDays, val].sort((a, b) => b - a);
    onChange(updated);
    setCustomInput('');
    setShowCustomForm(false);
    toast.success(`Added ${val} days reminder benchmark`);
  };

  // Preset days that are not in selectedDays
  const availablePresets = PRESET_DAYS.filter((d) => !selectedDays.includes(d));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2.5 items-center">
        <AnimatePresence>
          {selectedDays.map((day) => (
            <motion.button
              key={day}
              type="button"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={() => toggleDay(day)}
              className="group flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs shadow-sm hover:bg-indigo-700 transition-all duration-150 ring-2 ring-indigo-500/20"
            >
              <span>{day} {day === 1 ? 'day' : 'days'} before</span>
              <X className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
            </motion.button>
          ))}
        </AnimatePresence>

        {/* Quick Add Available Presets */}
        {availablePresets.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => toggleDay(day)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-medium hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ {day} {day === 1 ? 'day' : 'days'}</span>
          </button>
        ))}

        {/* Custom Day Input Button / Form */}
        {!showCustomForm ? (
          <button
            type="button"
            onClick={() => setShowCustomForm(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:border-indigo-400 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-500" />
            <span>Custom Day</span>
          </button>
        ) : (
          <form onSubmit={handleAddCustom} className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="365"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="e.g. 14"
              className="w-20 px-2.5 py-1 rounded-xl text-xs font-semibold border border-indigo-400 dark:border-indigo-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
            <button
              type="submit"
              className="px-3 py-1 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setShowCustomForm(false)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>

      {selectedDays.length === 0 && (
        <div className="flex items-center gap-2 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>At least one reminder day must be selected.</span>
        </div>
      )}
    </div>
  );
};
