import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface NotificationToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  icon?: LucideIcon;
  disabled?: boolean;
}

export const NotificationToggle: React.FC<NotificationToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  icon: Icon,
  disabled = false,
}) => {
  const handleToggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <div
      onClick={handleToggle}
      className={`flex items-start justify-between gap-4 p-4 rounded-2xl border transition-all duration-200 ${
        disabled
          ? 'opacity-60 cursor-not-allowed border-slate-200 dark:border-slate-800'
          : 'cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700/60 border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800/40'
      }`}
    >
      <div className="flex items-start gap-3.5 flex-1 min-w-0">
        {Icon && (
          <div
            className={`p-2.5 rounded-xl shrink-0 transition-colors ${
              checked
                ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div className="space-y-0.5">
          <label className="text-sm font-bold text-slate-900 dark:text-slate-100 cursor-pointer block select-none">
            {label}
          </label>
          {description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed select-none">
              {description}
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          handleToggle();
        }}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
          checked ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
        }`}
      >
        <motion.span
          layout
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
          }}
          animate={{ x: checked ? 20 : 0 }}
          className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out"
        />
      </button>
    </div>
  );
};
