import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NotificationPreferences, NotificationItem } from '../types/notifications';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  registerFCMToken,
  MOCK_NOTIFICATION_PREFS,
} from '../api/notifications';

interface NotificationState {
  preferences: NotificationPreferences;
  pushPermission: NotificationPermission | null;
  fcmToken: string | null;
  notifications: NotificationItem[];
  bannerDismissedUntil: number | null;
  bannerNeverAsk: boolean;
  isLoading: boolean;
  
  // Actions
  fetchPreferences: () => Promise<void>;
  savePreferences: (updated: Partial<NotificationPreferences>) => Promise<boolean>;
  setPushPermission: (permission: NotificationPermission) => void;
  setFcmToken: (token: string | null) => void;
  addNotification: (item: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissBannerTemporary: (days?: number) => void;
  dismissBannerPermanent: () => void;
  isBannerDismissed: () => boolean;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n-1',
    title: 'Master Service Agreement Expiring',
    body: 'MSA #2024-89 with Acme Corp expires in 14 days. Review terms now.',
    contractId: 'c-1',
    contractTitle: 'Acme Corp Master Service Agreement',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    read: false,
    type: 'reminder',
  },
  {
    id: 'n-2',
    title: 'Auto-Scan Completed',
    body: 'LegalEase successfully scanned 3 new contracts from connected accounts.',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    read: false,
    type: 'rescan',
  },
  {
    id: 'n-3',
    title: 'High Risk Clause Flagged',
    body: 'Unlimited liability clause detected in Vendor Agreement #402.',
    contractId: 'c-3',
    contractTitle: 'Vendor Services Agreement',
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    read: true,
    type: 'security',
  },
];

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      preferences: MOCK_NOTIFICATION_PREFS,
      pushPermission: typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : null,
      fcmToken: null,
      notifications: INITIAL_NOTIFICATIONS,
      bannerDismissedUntil: null,
      bannerNeverAsk: false,
      isLoading: false,

      fetchPreferences: async () => {
        set({ isLoading: true });
        try {
          const prefs = await getNotificationPreferences();
          set({ preferences: prefs, isLoading: false });
        } catch {
          set({ isLoading: false });
        }
      },

      savePreferences: async (updated: Partial<NotificationPreferences>) => {
        set({ isLoading: true });
        try {
          const current = get().preferences;
          const newPrefs = { ...current, ...updated };
          const saved = await updateNotificationPreferences(newPrefs);
          set({ preferences: saved, isLoading: false });
          return true;
        } catch {
          set({ isLoading: false });
          return false;
        }
      },

      setPushPermission: (permission: NotificationPermission) => {
        set({ pushPermission: permission });
        if (permission === 'granted') {
          const updated = { ...get().preferences, pushEnabled: true };
          set({ preferences: updated });
        } else if (permission === 'denied') {
          const updated = { ...get().preferences, pushEnabled: false };
          set({ preferences: updated });
        }
      },

      setFcmToken: (token: string | null) => {
        set({ fcmToken: token });
        if (token) {
          registerFCMToken(token);
        }
      },

      addNotification: (item) => {
        const newItem: NotificationItem = {
          ...item,
          id: `n-${Date.now()}`,
          createdAt: new Date().toISOString(),
          read: false,
        };
        set((state) => ({
          notifications: [newItem, ...state.notifications],
        }));
      },

      markAsRead: (id: string) => {
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        }));
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }));
      },

      dismissBannerTemporary: (days = 7) => {
        const expiryTime = Date.now() + days * 24 * 60 * 60 * 1000;
        set({ bannerDismissedUntil: expiryTime });
      },

      dismissBannerPermanent: () => {
        set({ bannerNeverAsk: true });
      },

      isBannerDismissed: () => {
        const { bannerNeverAsk, bannerDismissedUntil, pushPermission } = get();
        if (pushPermission === 'granted') return true;
        if (bannerNeverAsk) return true;
        if (bannerDismissedUntil && Date.now() < bannerDismissedUntil) return true;
        return false;
      },
    }),
    {
      name: 'legalease-notification-store',
      partialize: (state) => ({
        preferences: state.preferences,
        fcmToken: state.fcmToken,
        notifications: state.notifications,
        bannerDismissedUntil: state.bannerDismissedUntil,
        bannerNeverAsk: state.bannerNeverAsk,
      }),
    }
  )
);
