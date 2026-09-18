export type NotificationChannel = 'email' | 'push' | 'sms';

export interface NotificationPreferences {
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  phoneNumber: string | null;
  reminderDays: number[];
  rescanNotify: boolean;
}

export interface PushSubscription {
  endpoint: string;
  keys?: {
    p256dh: string;
    auth: string;
  };
  token?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  contractId?: string;
  contractTitle?: string;
  createdAt: string;
  read: boolean;
  type: 'reminder' | 'system' | 'rescan' | 'security';
}
