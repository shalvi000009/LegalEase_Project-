export type IntegrationProvider = 'gmail' | 'google_drive' | 'inbound_email';

export interface Integration {
  id: string;
  provider: IntegrationProvider;
  email?: string;
  folderId?: string;
  lastScannedAt?: string;
  isActive: boolean;
  createdAt: string;
}

export type ScanAction = 
  | 'detected' 
  | 'classified' 
  | 'deduplicated' 
  | 'analyzed' 
  | 'skipped' 
  | 'failed';

export interface ScanLogEntry {
  id: string;
  userId: string;
  integrationId: string;
  sourceRef: string;
  sourceName: string;
  action: ScanAction;
  docId?: string;
  classifierScore?: number;
  createdAt: string;
  details?: string;
}

export interface OAuthCallbackParams {
  code: string;
  state: string;
  error?: string;
}

export interface ScanHistoryFilters {
  action?: ScanAction | 'all';
  provider?: IntegrationProvider | 'all';
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface ScanPaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
