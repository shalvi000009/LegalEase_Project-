import React from 'react';
import { motion } from 'framer-motion';
import { FileText, BarChart3, Split } from 'lucide-react';
import { PanelViewMode } from '../../store/pdfStore';

interface MobileTabsProps {
  activeTab: PanelViewMode;
  onTabChange: (tab: PanelViewMode) => void;
  isDesktop?: boolean;
}

export const MobileTabs: React.FC<MobileTabsProps> = ({
  activeTab,
  onTabChange,
  isDesktop = false,
}) => {
  const tabs: { id: PanelViewMode; label: string; icon: React.ElementType }[] = [
    { id: 'pdf', label: 'Document PDF', icon: FileText },
    { id: 'split', label: 'Split View', icon: Split },
    { id: 'analysis', label: 'Analysis Report', icon: BarChart3 },
  ];

  return (
    <div className="flex items-center justify-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-inner max-w-md mx-auto my-3">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        // Hide split view option if on small mobile screens
        if (!isDesktop && tab.id === 'split') return null;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              isActive
                ? 'text-indigo-600 dark:text-indigo-400 font-extrabold shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeMobileTab"
                className="absolute inset-0 bg-white dark:bg-slate-900 rounded-lg shadow-sm"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
