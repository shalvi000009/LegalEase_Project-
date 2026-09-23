import React from 'react';
import { motion } from 'framer-motion';
import { Sliders, Bell, Cpu, User } from 'lucide-react';

export type SettingsTabId = 'general' | 'notifications' | 'integrations' | 'account';

interface TabItem {
  id: SettingsTabId;
  label: string;
  icon: React.ElementType;
}

const TABS: TabItem[] = [
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'general', label: 'General', icon: Sliders },
  { id: 'integrations', label: 'Integrations', icon: Cpu },
  { id: 'account', label: 'Account', icon: User },
];

interface SettingsTabsProps {
  activeTab: SettingsTabId;
  onChangeTab: (tab: SettingsTabId) => void;
}

export const SettingsTabs: React.FC<SettingsTabsProps> = ({ activeTab, onChangeTab }) => {
  return (
    <div className="border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none">
      <nav className="flex items-center gap-2 min-w-max pb-px" aria-label="Settings Tabs">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-3 text-xs font-bold transition-colors duration-150 ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>

              {isActive && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
