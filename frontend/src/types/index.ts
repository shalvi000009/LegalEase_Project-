export * from './auth';
export * from './document';
export * from './integrations';

export type Theme = 'light' | 'dark' | 'system';

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  disabled?: boolean;
  badge?: string;
}
