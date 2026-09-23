import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UploadCloud,
  FileText,
  Shield,
  Settings,
  X,
  Radio,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../hooks/useAuth';
import { useVaultStore } from '../../store/vaultStore';
import { useIntegrationStore } from '../../store/integrationStore';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: string;
  getBadge?: (expiringCount: number, activeIntegrations: number) => string | undefined;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: UploadCloud, label: 'Upload Contract', href: '/upload' },
  { icon: FileText, label: 'My Documents', href: '/documents' },
  { 
    icon: Shield, 
    label: 'Contract Vault', 
    href: '/vault',
    getBadge: (count: number) => (count > 0 ? `${count} expiring` : undefined)
  },
  { 
    icon: Radio, 
    label: 'Auto-Scan', 
    href: '/integrations',
    getBadge: (_, activeCount) => (activeCount > 0 ? `${activeCount} live` : undefined)
  },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, onCloseMobile }) => {
  const { user } = useAuth();
  const contracts = useVaultStore((state) => state.contracts);
  const integrations = useIntegrationStore((state) => state.integrations);
  const expiringCount = contracts.filter((c) => c.status === 'expiring_soon' || (c.daysRemaining > 0 && c.daysRemaining <= 30)).length;
  const activeIntegrationsCount = integrations.filter((i) => i.isActive).length;

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between p-4 overflow-y-auto">
      <div className="space-y-1">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Navigation
          </span>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const badgeText = item.getBadge ? item.getBadge(expiringCount, activeIntegrationsCount) : item.badge;

          return (
            <NavLink
              key={item.label}
              to={item.href}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all duration-200 min-h-[44px]',
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100'
                )
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              {badgeText && (
                <span className="text-[10px] bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                  {badgeText}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Footer Profile / Workspace Info */}
      <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        {user && (
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
              {user.name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md hidden md:block shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop (tap overlay to close) */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          {/* Mobile Sidebar Content */}
          <div className="relative w-72 max-w-[85vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-10 shadow-2xl flex flex-col">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
