import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { PushPermissionPrompt } from '../notifications/PushPermissionPrompt';
import { NotificationBanner } from '../notifications/NotificationBanner';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { ChatSidebar } from '../chat/ChatSidebar';
import { useChatStore } from '../../store/chatStore';

import { useLocation } from 'react-router-dom';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { activeForegroundNotice, clearForegroundNotice } = usePushNotifications();
  const { isChatOpen, setIsChatOpen, currentDocId } = useChatStore();

  const isSpecializedChatRoute = location.pathname.includes('/results') || location.pathname.includes('/chat');

  return (
    <div className="workspace-surface min-h-screen flex flex-col">
      <PushPermissionPrompt />
      <Header onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)} />
      <NotificationBanner
        notification={activeForegroundNotice}
        onDismiss={clearForegroundNotice}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar mobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-7 lg:p-8">
          <div className="max-w-[1440px] mx-auto space-y-6">{children}</div>
        </main>
      </div>
      {!isSpecializedChatRoute && (
        <ChatSidebar
          docId={currentDocId}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      )}
      <Footer />
    </div>
  );
};
