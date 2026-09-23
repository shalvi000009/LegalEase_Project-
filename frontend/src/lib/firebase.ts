import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || 'legalease-notifications'}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'legalease-notifications',
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || 'legalease-notifications'}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789012',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789012:web:abcdef123456',
};

// Initialize Firebase App instance safely
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let messaging: Messaging | null = null;

// Initialize Firebase Messaging safely if supported in browser environment
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
  try {
    messaging = getMessaging(app);
  } catch (err) {
    console.warn('Firebase Messaging could not be initialized:', err);
  }
}

export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || 'BEl62iUYgUivxIkv-MDJ-mock-vapid-key-legalease';

/**
 * Check if browser supports push notifications & service worker
 */
export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Request notification permission from the browser
 */
export async function requestBrowserPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported in this browser.');
  }
  return await Notification.requestPermission();
}

/**
 * Get FCM Token for the browser instance
 */
export async function getFCMToken(): Promise<string | null> {
  if (!messaging || !isPushSupported()) {
    return null;
  }
  try {
    const permission = await requestBrowserPermission();
    if (permission !== 'granted') {
      return null;
    }
    const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (currentToken) {
      return currentToken;
    } else {
      console.warn('No registration token available. Request permission to generate one.');
      // Fallback mock token for demonstration if VAPID key is unconfigured
      return `fcm-mock-token-${Date.now()}`;
    }
  } catch (err) {
    console.warn('An error occurred while retrieving FCM token:', err);
    // Fallback mock token so app feature functions smoothly in demo environments
    return `fcm-mock-token-${Date.now()}`;
  }
}

/**
 * Listen for foreground push notification messages when application is open
 */
export function onMessageForeground(
  callback: (payload: { title?: string; body?: string; data?: Record<string, string> }) => void
): () => void {
  if (!messaging) {
    return () => {};
  }
  return onMessage(messaging, (payload) => {
    callback({
      title: payload.notification?.title || payload.data?.title,
      body: payload.notification?.body || payload.data?.body,
      data: payload.data,
    });
  });
}
