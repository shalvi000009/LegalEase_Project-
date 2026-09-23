import React from 'react';
import { SettingsSection } from './SettingsSection';
import { Sun, Globe, Clock, Monitor } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';

export const GeneralSettings: React.FC = () => {
  return (
    <div className="space-y-6">
      <SettingsSection
        title="Appearance"
        description="Customize how LegalEase looks on your device"
        icon={Sun}
      >
        <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-slate-800 text-amber-600 dark:text-amber-400">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Color Theme</p>
              <p className="text-xs text-slate-500">Toggle between Light, Dark, or System mode</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Regional & Timezone"
        description="Set your language and contract deadline timezone preferences"
        icon={Globe}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Language
            </label>
            <div className="flex items-center gap-2 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Globe className="w-4 h-4 text-slate-400" />
              <select className="flex-1 bg-transparent text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer">
                <option value="en">English (US)</option>
                <option value="es">Español (Coming Soon)</option>
                <option value="fr">Français (Coming Soon)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Contract Timezone
            </label>
            <div className="flex items-center gap-2 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Clock className="w-4 h-4 text-slate-400" />
              <select className="flex-1 bg-transparent text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer">
                <option value="UTC-8">(UTC-08:00) Pacific Time</option>
                <option value="UTC-5">(UTC-05:00) Eastern Time</option>
                <option value="UTC+0">(UTC+00:00) UTC / GMT</option>
                <option value="UTC+5.5">(UTC+05:30) India Standard Time</option>
              </select>
            </div>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
};
