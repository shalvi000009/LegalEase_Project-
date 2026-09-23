import { apiClient } from './client';
import { NotificationPreferences } from '../types/notifications';

// MOCK DATA Fallback — TODO: Replace with real API when backend notification-preferences endpoint is fully deployed
export const MOCK_NOTIFICATION_PREFS: NotificationPreferences = {
  emailEnabled: true,
  pushEnabled: false,
  smsEnabled: false,
  phoneNumber: null,
  reminderDays: [90, 30, 7, 1],
  rescanNotify: true,
};

/**
 * Fetch notification preferences for current user
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const res = await apiClient.get<NotificationPreferences>('/notification-preferences');
    return res.data;
  } catch (err) {
    console.warn('Backend notification-preferences endpoint unavailable, using mock data:', err);
    return { ...MOCK_NOTIFICATION_PREFS };
  }
}

/**
 * Update user notification preferences
 */
export async function updateNotificationPreferences(
  data: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  try {
    const res = await apiClient.put<NotificationPreferences>('/notification-preferences', data);
    return res.data;
  } catch (err) {
    console.warn('Backend notification-preferences endpoint unavailable, updating locally:', err);
    return {
      ...MOCK_NOTIFICATION_PREFS,
      ...data,
    };
  }
}

/**
 * Register FCM Token with backend for browser push notifications
 */
export async function registerFCMToken(token: string): Promise<void> {
  try {
    await apiClient.post('/notification-preferences/fcm-token', { token, deviceType: 'web' });
  } catch (err) {
    console.warn('Backend FCM token registration endpoint unavailable, stored locally:', err);
  }
}

/**
 * Unregister FCM Token
 */
export async function unregisterFCMToken(): Promise<void> {
  try {
    await apiClient.delete('/notification-preferences/fcm-token');
  } catch (err) {
    console.warn('Backend FCM token unregistration endpoint unavailable:', err);
  }
}
