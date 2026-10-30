import React from 'react';
import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UploadCloud,
  FileText,
  Shield,
  Settings,
  X,
  Radio,
  MessageSquare,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../hooks/useAuth';
import { useVaultStore } from '../../store/vaultStore';
import { useIntegrationStore } from '../../store/integrationStore';
import { useChatStore } from '../../store/chatStore';

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
  const { isChatOpen, toggleChatOpen } = useChatStore();
  const expiringCount = contracts.filter((c) => c.status === 'expiring_soon' || (c.daysRemaining > 0 && c.daysRemaining <= 30)).length;
  const activeIntegrationsCount = integrations.filter((i) => i.isActive).length;

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between p-4 overflow-y-auto bg-[#0a1021] text-slate-100">
      <div className="space-y-1">
        <div className="flex items-center justify-between px-3 py-3 mb-2 border-b border-white/10">
          <span className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">Workspace</span>
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

        {navItems.filter(item => item.href !== '/settings').map((item) => {
          const Icon = item.icon;
          const badgeText = item.getBadge ? item.getBadge(expiringCount, activeIntegrationsCount) : item.badge;

          return (
            <NavLink
              key={item.label}
              to={item.href}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all duration-200 min-h-[44px] relative',
                  isActive
                    ? 'bg-white/[.12] text-white shadow-lg shadow-black/10 font-bold'
                    : 'text-slate-400 hover:bg-white/[.06] hover:text-white'
                )
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              {badgeText && (
                <span className="text-[10px] bg-amber-400/15 text-amber-300 border border-amber-300/20 px-2 py-0.5 rounded-full font-bold">
                  {badgeText}
                </span>
              )}
            </NavLink>
          );
        })}

        {/* AI Assistant (Chatbot) */}
        <button
          type="button"
          onClick={() => {
            toggleChatOpen();
            if (onCloseMobile) onCloseMobile();
          }}
          className={cn(
            'w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all duration-200 min-h-[44px]',
            isChatOpen
              ? 'bg-white/[.12] text-white shadow-md shadow-black/20 font-bold'
              : 'text-slate-400 hover:bg-white/[.06] hover:text-white'
          )}
        >
          <div className="flex items-center gap-3">
            <MessageSquare className="w-4 h-4 shrink-0 text-[#2ed3c7]" />
            <span>AI Assistant</span>
          </div>
          <span className="text-[10px] bg-cyan-300/10 text-cyan-200 border border-cyan-300/20 px-2 py-0.5 rounded-full font-bold">
            Chat
          </span>
        </button>

        {/* Settings (At the very last position) */}
        {navItems.filter(item => item.href === '/settings').map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.label}
              to={item.href}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all duration-200 min-h-[44px]',
                  isActive
                    ? 'bg-white/[.12] text-white shadow-md shadow-black/20 font-bold'
                    : 'text-slate-400 hover:bg-white/[.06] hover:text-white'
                )
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
            </NavLink>
          );
        })}
      </div>

      {/* Footer Profile / Workspace Info */}
      <div className="space-y-3 pt-4 border-t border-white/10">
        {user && (
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[.06] border border-white/10">
            <div className="w-8 h-8 rounded-lg bg-[#2ed3c7] text-[#0a1021] flex items-center justify-center font-bold text-xs shrink-0">
              {user.name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{user.name}</p>
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
      <aside className="w-64 border-r border-white/10 bg-[#0a1021] hidden md:block shrink-0">
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
          <motion.div initial={{ x: -24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -24, opacity: 0 }} className="relative w-72 max-w-[85vw] bg-[#0a1021] border-r border-white/10 z-10 shadow-2xl flex flex-col">
            {sidebarContent}
          </motion.div>
        </div>
      )}
    </>
  );
};
