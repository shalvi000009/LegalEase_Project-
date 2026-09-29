import { apiClient } from './client';
import { NotificationPreferences } from '../types/notifications';
import { useAuthStore } from '../store/authStore';

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
 * Normalizes backend response (which can be snake_case or camelCase) into NotificationPreferences
 */
export function mapBackendToNotificationPrefs(data: any): NotificationPreferences {
  if (!data) return { ...MOCK_NOTIFICATION_PREFS };
  
  const rawDays = data.reminderDays ?? data.reminder_days;
  const reminderDays = Array.isArray(rawDays)
    ? rawDays.map((d: any) => Number(d)).filter((d: number) => !isNaN(d))
    : [90, 30, 7, 1];

  return {
    emailEnabled: Boolean(data.emailEnabled ?? data.email_enabled ?? true),
    pushEnabled: Boolean(data.pushEnabled ?? data.push_enabled ?? false),
    smsEnabled: Boolean(data.smsEnabled ?? data.sms_enabled ?? false),
    phoneNumber: data.phoneNumber ?? data.phone_number ?? null,
    reminderDays,
    rescanNotify: Boolean(data.rescanNotify ?? data.rescan_notify ?? true),
  };
}

/**
 * Converts camelCase NotificationPreferences into backend snake_case payload
 */
export function mapNotificationPrefsToBackend(data: Partial<NotificationPreferences>): Record<string, any> {
  const payload: Record<string, any> = {};
  if (data.emailEnabled !== undefined) payload.email_enabled = data.emailEnabled;
  if (data.pushEnabled !== undefined) payload.push_enabled = data.pushEnabled;
  if (data.smsEnabled !== undefined) payload.sms_enabled = data.smsEnabled;
  if (data.phoneNumber !== undefined) payload.phone_number = data.phoneNumber;
  if (data.reminderDays !== undefined) payload.reminder_days = data.reminderDays;
  if (data.rescanNotify !== undefined) payload.rescan_notify = data.rescanNotify;
  
  // Also keep camelCase properties for compatibility
  if (data.emailEnabled !== undefined) payload.emailEnabled = data.emailEnabled;
  if (data.pushEnabled !== undefined) payload.pushEnabled = data.pushEnabled;
  if (data.smsEnabled !== undefined) payload.smsEnabled = data.smsEnabled;
  if (data.phoneNumber !== undefined) payload.phoneNumber = data.phoneNumber;
  if (data.reminderDays !== undefined) payload.reminderDays = data.reminderDays;
  if (data.rescanNotify !== undefined) payload.rescanNotify = data.rescanNotify;

  return payload;
}

/**
 * Fetch notification preferences for current user
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const res = await apiClient.get<any>('/notification-preferences');
    return mapBackendToNotificationPrefs(res.data);
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
    const payload = mapNotificationPrefsToBackend(data);
    const res = await apiClient.post<any>('/notification-preferences', payload);
    return mapBackendToNotificationPrefs(res.data);
  } catch (err) {
    console.warn('Backend notification-preferences endpoint unavailable, updating locally:', err);
    return mapBackendToNotificationPrefs({
      ...MOCK_NOTIFICATION_PREFS,
      ...data,
    });
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

/**
 * Fetch active in-app notifications
 */
export async function fetchLiveNotifications(): Promise<any[]> {
  try {
    const res = await apiClient.get<any[]>('/notification-preferences/notifications');
    return res.data;
  } catch (err) {
    return [];
  }
}

/**
 * Subscribe to SSE real-time notification stream
 */
export function subscribeNotificationStream(onMessage: (item: any) => void): () => void {
  const token = useAuthStore.getState().accessToken || localStorage.getItem('legalease_access_token') || '';
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
  const url = `${baseUrl}/notification-preferences/stream?token=${encodeURIComponent(token)}`;

  let es: EventSource | null = null;
  try {
    es = new EventSource(url);
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.title) {
          onMessage(data);
        }
      } catch {}
    };
  } catch (err) {
    console.warn('[Notification SSE] Could not create EventSource stream:', err);
  }

  return () => {
    if (es) es.close();
  };
}
