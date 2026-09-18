import React, { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  LogOut,
  Bell,
  ChevronDown,
  ChevronRight,
  Settings,
  Menu,
  MessageSquare,
  CheckCheck,
  Calendar,
  ShieldAlert,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Logo } from '../ui/Logo';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useAuth } from '../../hooks/useAuth';
import { useChatStore } from '../../store/chatStore';
import { useNotificationStore } from '../../store/notificationStore';
import { NotificationItem } from '../../types/notifications';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toggleChatOpen = useChatStore((state) => state.toggleChatOpen);

  const { notifications, markAsRead, markAllAsRead } = useNotificationStore();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [noticeDropdownOpen, setNoticeDropdownOpen] = useState(false);

  const isResultsPage = location.pathname.includes('/results');

  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === '/dashboard') return [{ label: 'Dashboard', href: '/dashboard' }];
    if (path === '/upload') return [{ label: 'Dashboard', href: '/dashboard' }, { label: 'Upload Contract', href: '/upload' }];
    if (path === '/documents') return [{ label: 'Dashboard', href: '/dashboard' }, { label: 'My Documents', href: '/documents' }];
    if (path.startsWith('/documents/') && path.endsWith('/results')) {
      return [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'My Documents', href: '/documents' },
        { label: 'Analysis Results', href: path },
      ];
    }
    if (path.startsWith('/documents/')) {
      return [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'My Documents', href: '/documents' },
        { label: 'Overview', href: path },
      ];
    }
    if (path === '/vault') return [{ label: 'Dashboard', href: '/dashboard' }, { label: 'Contract Vault', href: '/vault' }];
    if (path === '/settings') return [{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings', href: '/settings' }];
    return [{ label: 'LegalEase', href: '/dashboard' }];
  };

  const breadcrumbs = getBreadcrumbs();

  const handleNotificationClick = (item: NotificationItem) => {
    markAsRead(item.id);
    setNoticeDropdownOpen(false);
    if (item.contractId) {
      navigate(`/documents/${item.contractId}`);
    } else {
      navigate('/vault');
    }
  };

  const getIconForType = (type: NotificationItem['type']) => {
    switch (type) {
      case 'reminder':
        return <Calendar className="w-4 h-4 text-indigo-500" />;
      case 'security':
        return <ShieldAlert className="w-4 h-4 text-amber-500" />;
      case 'rescan':
        return <Sparkles className="w-4 h-4 text-purple-500" />;
      default:
        return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3 sm:gap-6">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <Logo size="md" />

        {/* Breadcrumb Navigation */}
        <nav className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.href + idx}>
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
              {idx === breadcrumbs.length - 1 ? (
                <span className="font-bold text-slate-900 dark:text-slate-100">{crumb.label}</span>
              ) : (
                <Link to={crumb.href} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  {crumb.label}
                </Link>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Chat Drawer Toggle (Results Page) */}
        {isResultsPage && (
          <button
            onClick={toggleChatOpen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors text-xs font-semibold shadow-xs"
            aria-label="Open AI Contract Chat"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Ask AI</span>
          </button>
        )}

        {/* Notification Bell & Popover Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setNoticeDropdownOpen((prev) => !prev);
              setProfileDropdownOpen(false);
            }}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 px-1.5 py-0.5 text-[10px] font-black leading-none text-white bg-indigo-600 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {noticeDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 py-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-full">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                    <Bell className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
                    <p className="font-semibold">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`p-3.5 flex items-start gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                        !item.read ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                      }`}
                    >
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                        {getIconForType(item.type)}
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs truncate ${!item.read ? 'font-bold text-slate-900 dark:text-slate-100' : 'font-semibold text-slate-700 dark:text-slate-300'}`}>
                            {item.title}
                          </p>
                          {!item.read && (
                            <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                          {item.body}
                        </p>
                        {item.contractTitle && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 pt-1">
                            <span>{item.contractTitle}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 px-4 border-t border-slate-100 dark:border-slate-800 text-center">
                <button
                  onClick={() => {
                    setNoticeDropdownOpen(false);
                    navigate('/settings');
                  }}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Notification Preferences →
                </button>
              </div>
            </div>
          )}
        </div>

        <ThemeToggle />

        {/* User Profile Dropdown */}
        {user && (
          <div className="relative">
            <button
              onClick={() => {
                setProfileDropdownOpen((prev) => !prev);
                setNoticeDropdownOpen(false);
              }}
              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-indigo-500/30">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {user.name}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {user.email}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {profileDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                onClick={() => setProfileDropdownOpen(false)}
              >
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 sm:hidden">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{user.name}</p>
                  <p className="text-[11px] text-slate-500">{user.email}</p>
                </div>
                <Link
                  to="/settings"
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  Settings
                </Link>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
