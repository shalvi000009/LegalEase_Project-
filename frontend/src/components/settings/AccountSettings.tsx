import React, { useState } from 'react';
import { SettingsSection } from './SettingsSection';
import { User, KeyRound, Trash2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

export const AccountSettings: React.FC = () => {
  const { user } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handlePasswordChange = () => {
    toast.success('Password reset link sent to your registered email address!');
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmText.trim().toLowerCase() !== 'delete') {
      toast.error('Please type "DELETE" to confirm account removal.');
      return;
    }
    toast.error('Account deletion requested. Support team will contact you within 24 hours.');
    setShowDeleteModal(false);
  };

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Profile Information"
        description="Your personal details and authentication status"
        icon={User}
      >
        <div className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-md">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{user?.name || 'Legal Ease User'}</h3>
            <p className="text-xs text-slate-500">{user?.email || 'user@legalease.ai'}</p>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <ShieldCheck className="w-3 h-3" />
              Verified Enterprise Account
            </span>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Security & Password"
        description="Manage your access credentials and session security"
        icon={KeyRound}
      >
        <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Password</p>
            <p className="text-xs text-slate-500">Last updated 30 days ago</p>
          </div>
          <button
            type="button"
            onClick={handlePasswordChange}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold transition-colors"
          >
            Change Password
          </button>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Danger Zone"
        description="Irreversible actions regarding your contracts and account data"
        icon={AlertTriangle}
      >
        <div className="p-4 rounded-2xl border border-red-200 dark:border-red-950 bg-red-50/50 dark:bg-red-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-red-900 dark:text-red-300">Delete Account & Data</p>
            <p className="text-xs text-red-600 dark:text-red-400">
              Permanently remove your profile, parsed documents, and scheduled reminder dates.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 text-xs font-bold transition-colors shrink-0 shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
            Delete Account
          </button>
        </div>
      </SettingsSection>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="p-3 rounded-2xl bg-red-100 dark:bg-red-950/60">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold">Confirm Account Deletion</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              This action cannot be undone. All your stored contracts, AI extraction histories, and reminders will be erased forever.
            </p>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Type <span className="text-red-600 font-mono">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2 rounded-xl text-xs font-mono border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors shadow-sm"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
