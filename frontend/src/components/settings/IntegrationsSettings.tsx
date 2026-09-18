import React from 'react';
import { SettingsSection } from './SettingsSection';
import { Mail, HardDrive, Sparkles } from 'lucide-react';

export const IntegrationsSettings: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
        <p className="text-xs text-indigo-900 dark:text-indigo-200 font-medium">
          Auto-Scan integration accounts (Gmail & Google Drive) are coming in <strong>Week 8</strong>. LegalEase will automatically detect new contract attachments and sync renewal deadlines into your vault.
        </p>
      </div>

      <SettingsSection
        title="Email Providers"
        description="Auto-detect legal contracts and agreement attachments in your inbox"
        icon={Mail}
      >
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 font-bold text-xs">
              M
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Google Workspace / Gmail</p>
              <p className="text-xs text-slate-500">Scan emails for PDF & DOCX agreements</p>
            </div>
          </div>
          <button
            type="button"
            disabled
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 text-xs font-bold cursor-not-allowed border border-slate-200 dark:border-slate-700"
          >
            Connect Gmail (Week 8)
          </button>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Cloud Storage"
        description="Sync contracts directly from cloud folders"
        icon={HardDrive}
      >
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-xs">
              GD
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Google Drive</p>
              <p className="text-xs text-slate-500">Watch folders for contract additions and updates</p>
            </div>
          </div>
          <button
            type="button"
            disabled
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 text-xs font-bold cursor-not-allowed border border-slate-200 dark:border-slate-700"
          >
            Connect Drive (Week 8)
          </button>
        </div>
      </SettingsSection>
    </div>
  );
};
