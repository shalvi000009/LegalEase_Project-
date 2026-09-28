import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Bell, MessageSquare, Save, RefreshCw, Smartphone, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNotificationStore } from '../store/notificationStore';
import { NotificationPreferences } from '../types/notifications';
import { MOCK_NOTIFICATION_PREFS } from '../api/notifications';
import { SettingsTabs, SettingsTabId } from '../components/settings/SettingsTabs';
import { SettingsSection } from '../components/settings/SettingsSection';
import { NotificationToggle } from '../components/settings/NotificationToggle';
import { ReminderDayChips } from '../components/settings/ReminderDayChips';
import { PhoneInput } from '../components/settings/PhoneInput';
import { GeneralSettings } from '../components/settings/GeneralSettings';
import { AccountSettings } from '../components/settings/AccountSettings';
import { IntegrationsSettings } from '../components/settings/IntegrationsSettings';
import { MainLayout } from '../components/layout/MainLayout';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('notifications');
  
  const { preferences, fetchPreferences, savePreferences, isLoading } = useNotificationStore();
  
  // Local form state for notification preferences with safe default fallbacks
  const [formData, setFormData] = useState<NotificationPreferences>(() => ({
    ...MOCK_NOTIFICATION_PREFS,
    ...(preferences || {}),
  }));
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingTab, setPendingTab] = useState<SettingsTabId | null>(null);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  useEffect(() => {
    if (preferences) {
      setFormData({
        emailEnabled: preferences.emailEnabled ?? true,
        pushEnabled: preferences.pushEnabled ?? false,
        smsEnabled: preferences.smsEnabled ?? false,
        phoneNumber: preferences.phoneNumber ?? null,
        reminderDays: Array.isArray(preferences.reminderDays) ? preferences.reminderDays : [90, 30, 7, 1],
        rescanNotify: preferences.rescanNotify ?? true,
      });
      setIsDirty(false);
    }
  }, [preferences]);

  const handleUpdate = (field: keyof NotificationPreferences, value: unknown) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      setIsDirty(JSON.stringify(updated) !== JSON.stringify(preferences));
      return updated;
    });
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Validation checks
    if (formData.reminderDays.length === 0) {
      toast.error('Please select at least one reminder day.');
      return;
    }

    if (formData.smsEnabled && !formData.phoneNumber) {
      toast.error('Please enter a valid phone number for SMS notifications.');
      return;
    }

    setIsSaving(true);
    const success = await savePreferences(formData);
    setIsSaving(false);

    if (success) {
      setIsDirty(false);
      toast.success('Notification preferences saved successfully!');
      if (pendingTab) {
        setActiveTab(pendingTab);
        setPendingTab(null);
      }
    }
  };

  const handleTabChange = (newTab: SettingsTabId) => {
    if (isDirty && activeTab === 'notifications') {
      setPendingTab(newTab);
    } else {
      setActiveTab(newTab);
    }
  };

  const handleDiscardChanges = () => {
    setFormData(preferences);
    setIsDirty(false);
    if (pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Settings & Preferences
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your account, multi-channel reminder notifications, and integration settings
          </p>
        </div>

        {isDirty && activeTab === 'notifications' && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2 self-start sm:self-auto"
          >
            <button
              type="button"
              onClick={handleDiscardChanges}
              className="px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </motion.div>
        )}
      </div>

      {/* Tabs */}
      <SettingsTabs activeTab={activeTab} onChangeTab={handleTabChange} />

      {/* Tab Content Area */}
      <AnimatePresence mode="wait">
        {activeTab === 'notifications' && (
          <motion.form
            key="notifications-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSave}
            className="space-y-6"
          >
            {/* Section 1: Reminder Channels */}
            <SettingsSection
              title="Reminder Channels"
              description="Choose how LegalEase alerts you before contracts reach key expiration or renewal dates"
              icon={Bell}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <NotificationToggle
                  checked={formData.emailEnabled}
                  onChange={(val) => handleUpdate('emailEnabled', val)}
                  label="Email Notifications"
                  description="Receive rich HTML reminders directly in your inbox"
                  icon={Mail}
                />
                <NotificationToggle
                  checked={formData.pushEnabled}
                  onChange={(val) => handleUpdate('pushEnabled', val)}
                  label="Push Notifications"
                  description="Browser push alerts even when LegalEase tab is in background"
                  icon={Bell}
                />
                <NotificationToggle
                  checked={formData.smsEnabled}
                  onChange={(val) => handleUpdate('smsEnabled', val)}
                  label="SMS Notifications"
                  description="Urgent text message reminders sent to your mobile device"
                  icon={MessageSquare}
                />
              </div>
            </SettingsSection>

            {/* Section 2: Reminder Schedule */}
            <SettingsSection
              title="Reminder Schedule"
              description="Configure exact days before contract deadlines to receive automated alerts"
              icon={RefreshCw}
            >
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Remind me before:
                </label>
                <ReminderDayChips
                  selectedDays={formData.reminderDays}
                  onChange={(days) => handleUpdate('reminderDays', days)}
                />
              </div>
            </SettingsSection>

            {/* Section 3: SMS Settings (Only visible if SMS enabled) */}
            <AnimatePresence>
              {formData.smsEnabled && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <SettingsSection
                    title="SMS Settings"
                    description="Configure mobile phone details for text message reminders"
                    icon={Smartphone}
                  >
                    <PhoneInput
                      value={formData.phoneNumber}
                      onChange={(phone) => handleUpdate('phoneNumber', phone)}
                    />
                  </SettingsSection>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Section 4: Auto-Scan Notifications */}
            <SettingsSection
              title="Auto-Scan Notifications"
              description="Automated alerts when LegalEase background scanners discover new agreements"
              icon={Sparkles}
            >
              <NotificationToggle
                checked={formData.rescanNotify}
                onChange={(val) => handleUpdate('rescanNotify', val)}
                label="Notify me when new contracts are detected"
                description="Get notified when LegalEase finds new contracts in your connected accounts or cloud drives"
                icon={ShieldCheck}
              />
            </SettingsSection>

            {/* Save Preferences Primary Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving || isLoading}
                className="w-full sm:w-auto min-w-[200px] flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all duration-200 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving Preferences...' : 'Save Preferences'}</span>
              </button>
            </div>
          </motion.form>
        )}

        {activeTab === 'general' && (
          <motion.div key="general-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <GeneralSettings />
          </motion.div>
        )}

        {activeTab === 'account' && (
          <motion.div key="account-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <AccountSettings />
          </motion.div>
        )}

        {activeTab === 'integrations' && (
          <motion.div key="integrations-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <IntegrationsSettings />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unsaved changes pending tab shift modal */}
      {pendingTab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-500">
              <div className="p-3 rounded-2xl bg-amber-100 dark:bg-amber-950/60">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Unsaved Notification Changes
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              You have unsaved changes to your notification preferences. Would you like to save before switching tabs?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleDiscardChanges}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              >
                Discard & Switch
              </button>
              <button
                type="button"
                onClick={() => handleSave()}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-sm"
              >
                Save & Switch
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </MainLayout>
  );
};
