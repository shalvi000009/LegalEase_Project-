import { useEffect, useState, useCallback } from 'react';
import {
  isPushSupported,
  requestBrowserPermission,
  getFCMToken,
  onMessageForeground,
} from '../lib/firebase';
import { useNotificationStore } from '../store/notificationStore';
import { fetchLiveNotifications, subscribeNotificationStream, unregisterFCMToken } from '../api/notifications';
import toast from 'react-hot-toast';

export function usePushNotifications() {
  const {
    pushPermission,
    fcmToken,
    setPushPermission,
    setFcmToken,
    addNotification,
  } = useNotificationStore();

  const [supported, setSupported] = useState<boolean>(false);
  const [activeForegroundNotice, setActiveForegroundNotice] = useState<{
    id: string;
    title: string;
    body: string;
    createdAt: string;
    read: boolean;
    type: 'reminder' | 'system' | 'rescan' | 'security';
  } | null>(null);

  useEffect(() => {
    setSupported(isPushSupported());
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushPermission(Notification.permission);
    }
  }, [setPushPermission]);

  // Connect to Real-time Backend SSE Stream & Sync initial notifications
  useEffect(() => {
    fetchLiveNotifications().then((items) => {
      if (Array.isArray(items)) {
        items.forEach((item) => addNotification(item));
      }
    });

    const unsubscribeSSE = subscribeNotificationStream((item) => {
      addNotification(item);
      setActiveForegroundNotice(item);
      toast.success(`${item.title}: ${item.body}`);
    });

    return () => {
      unsubscribeSSE();
    };
  }, [addNotification]);

  // Handle foreground push messages
  useEffect(() => {
    if (!supported || pushPermission !== 'granted') return;

    const unsubscribe = onMessageForeground((payload) => {
      if (payload.title && payload.body) {
        const item = {
          id: `fcm-${Date.now()}`,
          title: payload.title,
          body: payload.body,
          contractId: payload.data?.contractId,
          contractTitle: payload.data?.contractTitle,
          createdAt: new Date().toISOString(),
          read: false,
          type: (payload.data?.type as 'reminder' | 'system' | 'rescan' | 'security') || 'reminder',
        };
        addNotification(item);
        setActiveForegroundNotice(item);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [supported, pushPermission, addNotification]);

  const requestPermission = useCallback(async () => {
    if (!supported) {
      throw new Error('Push notifications are not supported in your browser.');
    }
    const perm = await requestBrowserPermission();
    setPushPermission(perm);

    if (perm === 'granted') {
      const token = await getFCMToken();
      if (token) {
        setFcmToken(token);
      }
    }
    return perm;
  }, [supported, setPushPermission, setFcmToken]);

  const unregister = useCallback(async () => {
    try {
      await unregisterFCMToken();
      setFcmToken(null);
      setPushPermission('default');
      toast.success('Push notification subscription removed.');
    } catch {
      toast.error('Failed to unregister push notifications.');
    }
  }, [setFcmToken, setPushPermission]);

  return {
    permission: pushPermission,
    token: fcmToken,
    isSupported: supported,
    activeForegroundNotice,
    clearForegroundNotice: () => setActiveForegroundNotice(null),
    requestPermission,
    unregister,
  };
}
