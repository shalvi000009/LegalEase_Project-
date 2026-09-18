import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { PushPermissionPrompt } from '../notifications/PushPermissionPrompt';
import { NotificationBanner } from '../notifications/NotificationBanner';
import { usePushNotifications } from '../../hooks/usePushNotifications';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { activeForegroundNotice, clearForegroundNotice } = usePushNotifications();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <PushPermissionPrompt />
      <Header onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)} />
      <NotificationBanner
        notification={activeForegroundNotice}
        onDismiss={clearForegroundNotice}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar mobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
      <Footer />
    </div>
  );
};
