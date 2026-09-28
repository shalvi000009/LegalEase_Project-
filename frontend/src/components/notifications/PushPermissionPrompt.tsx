import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle2, X, ShieldAlert } from 'lucide-react';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { useNotificationStore } from '../../store/notificationStore';

export const PushPermissionPrompt: React.FC = () => {
  const { permission, isSupported, requestPermission } = usePushNotifications();
  const { isBannerDismissed, dismissBannerTemporary, dismissBannerPermanent } =
    useNotificationStore();

  const [statusState, setStatusState] = useState<'idle' | 'loading' | 'success' | 'denied'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If already dismissed, granted, or unsupported, do not render banner
  if (!isSupported || isBannerDismissed() || permission === 'granted') {
    return null;
  }

  const handleEnable = async () => {
    setStatusState('loading');
    setErrorMessage(null);
    try {
      const res = await requestPermission();
      if (res === 'granted') {
        setStatusState('success');
        setTimeout(() => {
          // Banner automatically hides after 3s on success
        }, 3000);
      } else if (res === 'denied') {
        setStatusState('denied');
        setErrorMessage('Push notifications are blocked in your browser settings.');
      } else {
        setStatusState('idle');
      }
    } catch (err: unknown) {
      setStatusState('denied');
      const msg = err instanceof Error ? err.message : 'Failed to request notification permission.';
      setErrorMessage(msg);
    }
  };

  const handleNotNow = () => {
    dismissBannerTemporary(7);
  };

  const handleNever = () => {
    dismissBannerPermanent();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -20, height: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-indigo-600 dark:bg-indigo-700 text-white shadow-lg overflow-hidden border-b border-indigo-500/30"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md shrink-0">
              {statusState === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-300" />
              ) : statusState === 'denied' ? (
                <ShieldAlert className="w-5 h-5 text-amber-300" />
              ) : (
                <Bell className="w-5 h-5 text-indigo-200 animate-pulse" />
              )}
            </div>

            <div className="space-y-0.5">
              {statusState === 'success' ? (
                <p className="font-bold text-sm text-emerald-200">Push notifications enabled!</p>
              ) : statusState === 'denied' ? (
                <p className="font-bold text-sm text-amber-200">{errorMessage || 'Notifications Blocked'}</p>
              ) : (
                <>
                  <p className="font-bold text-sm">Enable push notifications</p>
                  <p className="text-indigo-100/90 text-[11px]">
                    Receive instant browser alerts before contract renewal deadlines and auto-scan updates.
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {statusState === 'idle' && (
              <>
                <button
                  type="button"
                  onClick={handleEnable}
                  className="px-4 py-1.5 rounded-xl bg-white text-indigo-700 font-extrabold hover:bg-indigo-50 shadow-sm transition-colors"
                >
                  Enable
                </button>
                <button
                  type="button"
                  onClick={handleNotNow}
                  className="px-3 py-1.5 rounded-xl bg-indigo-700/60 hover:bg-indigo-700 text-indigo-100 font-semibold transition-colors"
                >
                  Not now
                </button>
                <button
                  type="button"
                  onClick={handleNever}
                  title="Never ask again"
                  className="p-1.5 rounded-xl text-indigo-200 hover:text-white hover:bg-indigo-700/60 transition-colors"
                  aria-label="Never ask again"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}

            {statusState === 'loading' && (
              <span className="font-bold text-indigo-100 animate-pulse">Requesting permission...</span>
            )}

            {statusState === 'denied' && (
              <button
                type="button"
                onClick={handleNotNow}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
