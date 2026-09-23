import { Integration, ScanLogEntry, ScanHistoryFilters, ScanPaginatedResponse, OAuthCallbackParams } from '../types/integrations';
import { apiClient } from './client';

// Initial Mock Datasets
const DEFAULT_MOCK_INTEGRATIONS: Integration[] = [
  {
    id: 'int-gmail-1',
    provider: 'gmail',
    email: 'krinapatel.dev@gmail.com',
    lastScannedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    isActive: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  },
  {
    id: 'int-drive-1',
    provider: 'google_drive',
    email: 'krinapatel.dev@gmail.com',
    folderId: 'folder_legal_contracts_2025',
    lastScannedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    isActive: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
  {
    id: 'int-forward-1',
    provider: 'inbound_email',
    email: 'krina@docs.legalease.in',
    lastScannedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    isActive: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
  },
];

const DEFAULT_MOCK_SCAN_HISTORY: ScanLogEntry[] = [
  {
    id: 'scan-1',
    userId: 'usr-1',
    integrationId: 'int-gmail-1',
    sourceRef: 'msg-98214',
    sourceName: 'Offer_Letter_TCS_Software_Engineer.pdf',
    action: 'analyzed',
    docId: 'doc-3',
    classifierScore: 0.94,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    details: 'Extracted 14 clauses, 2 high risks, 3 key renewal dates.',
  },
  {
    id: 'scan-2',
    userId: 'usr-1',
    integrationId: 'int-gmail-1',
    sourceRef: 'msg-98215',
    sourceName: 'Monthly_Hosting_Invoice_Jan2025.pdf',
    action: 'skipped',
    classifierScore: 0.18,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    details: 'Classifier score below threshold (0.18 < 0.65). Not a legal contract.',
  },
  {
    id: 'scan-3',
    userId: 'usr-1',
    integrationId: 'int-drive-1',
    sourceRef: 'drive-file-502',
    sourceName: 'Master_Services_Agreement_V2.docx',
    action: 'classified',
    docId: 'doc-4',
    classifierScore: 0.89,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    details: 'Classified as B2B Service Agreement.',
  },
  {
    id: 'scan-4',
    userId: 'usr-1',
    integrationId: 'int-gmail-1',
    sourceRef: 'msg-98216',
    sourceName: 'Non_Disclosure_Agreement_Client_X.pdf',
    action: 'detected',
    classifierScore: 0.82,
    createdAt: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    details: 'Detected PDF attachment from legal@clientx.com.',
  },
  {
    id: 'scan-5',
    userId: 'usr-1',
    integrationId: 'int-forward-1',
    sourceRef: 'fwd-1092',
    sourceName: 'Vendor_SLA_Agreement_2025.pdf',
    action: 'deduplicated',
    classifierScore: 0.91,
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    details: 'Checksum matches existing vault document doc-1. Skipping duplicate analysis.',
  },
  {
    id: 'scan-6',
    userId: 'usr-1',
    integrationId: 'int-gmail-1',
    sourceRef: 'msg-98217',
    sourceName: 'Encrypted_Contract_Archive.zip',
    action: 'failed',
    classifierScore: 0.05,
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    details: 'Extraction failed: Password-protected ZIP file cannot be read.',
  },
];

// Local Storage Helper for Mock Persistence
const STORAGE_KEYS = {
  INTEGRATIONS: 'legalease_integrations',
  SCAN_HISTORY: 'legalease_scan_history',
};

function getStoredIntegrations(): Integration[] {
  const stored = localStorage.getItem(STORAGE_KEYS.INTEGRATIONS);
  if (!stored) {
    localStorage.setItem(STORAGE_KEYS.INTEGRATIONS, JSON.stringify(DEFAULT_MOCK_INTEGRATIONS));
    return DEFAULT_MOCK_INTEGRATIONS;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return DEFAULT_MOCK_INTEGRATIONS;
  }
}

function setStoredIntegrations(items: Integration[]): void {
  localStorage.setItem(STORAGE_KEYS.INTEGRATIONS, JSON.stringify(items));
}

function getStoredScanHistory(): ScanLogEntry[] {
  const stored = localStorage.getItem(STORAGE_KEYS.SCAN_HISTORY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEYS.SCAN_HISTORY, JSON.stringify(DEFAULT_MOCK_SCAN_HISTORY));
    return DEFAULT_MOCK_SCAN_HISTORY;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return DEFAULT_MOCK_SCAN_HISTORY;
  }
}

function setStoredScanHistory(items: ScanLogEntry[]): void {
  localStorage.setItem(STORAGE_KEYS.SCAN_HISTORY, JSON.stringify(items));
}

/**
 * Fetch all connected accounts / integrations.
 * TODO: Connect to Shalvi's backend API endpoint GET /api/v1/integrations
 */
export async function getIntegrations(): Promise<Integration[]> {
  try {
    const response = await apiClient.get<Integration[]>('/integrations');
    return response.data;
  } catch {
    // Fallback to client mock state if backend endpoint is not ready
    return getStoredIntegrations();
  }
}

/**
 * Initiate Gmail OAuth Connection Flow
 * TODO: Connect to Shalvi's backend API endpoint GET /api/v1/integrations/google/connect?provider=gmail
 */
export async function connectGmail(): Promise<{ authUrl: string }> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'mock_client_id_legalease.apps.googleusercontent.com';
  const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/integrations/callback`;

  try {
    const response = await apiClient.get<{ authUrl: string }>('/integrations/google/connect', {
      params: { provider: 'gmail' },
    });
    return response.data;
  } catch {
    // Fallback constructed auth URL or mock callback url
    const mockAuthUrl = clientId.includes('mock') 
      ? `${window.location.origin}/integrations/callback?code=mock_gmail_auth_code_${Date.now()}&state=gmail`
      : `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent('https://www.googleapis.com/auth/gmail.readonly')}&state=gmail`;

    return { authUrl: mockAuthUrl };
  }
}

/**
 * Initiate Google Drive OAuth Connection Flow
 * TODO: Connect to Shalvi's backend API endpoint GET /api/v1/integrations/google/connect?provider=google_drive
 */
export async function connectGoogleDrive(): Promise<{ authUrl: string }> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'mock_client_id_legalease.apps.googleusercontent.com';
  const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/integrations/callback`;

  try {
    const response = await apiClient.get<{ authUrl: string }>('/integrations/google/connect', {
      params: { provider: 'google_drive' },
    });
    return response.data;
  } catch {
    const mockAuthUrl = clientId.includes('mock')
      ? `${window.location.origin}/integrations/callback?code=mock_drive_auth_code_${Date.now()}&state=google_drive`
      : `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent('https://www.googleapis.com/auth/drive.readonly')}&state=google_drive`;

    return { authUrl: mockAuthUrl };
  }
}

/**
 * Disconnect an active integration
 * TODO: Connect to Shalvi's backend API endpoint DELETE /api/v1/integrations/:id
 */
export async function disconnectIntegration(id: string): Promise<void> {
  try {
    await apiClient.delete(`/integrations/${id}`);
  } catch {
    // Fallback: update local mock storage
    const integrations = getStoredIntegrations().filter((item) => item.id !== id);
    setStoredIntegrations(integrations);
  }
}

/**
 * Get Auto-Scan History Logs with pagination & filtering
 * TODO: Connect to Shalvi's backend API endpoint GET /api/v1/integrations/scan-history
 */
export async function getScanHistory(
  page: number = 1,
  limit: number = 10,
  filters?: ScanHistoryFilters
): Promise<ScanPaginatedResponse<ScanLogEntry>> {
  try {
    const response = await apiClient.get<ScanPaginatedResponse<ScanLogEntry>>('/integrations/scan-history', {
      params: { page, limit, ...filters },
    });
    return response.data;
  } catch {
    let history = getStoredScanHistory();

    if (filters?.action && filters.action !== 'all') {
      history = history.filter((item) => item.action === filters.action);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      history = history.filter(
        (item) => item.sourceName.toLowerCase().includes(q) || item.sourceRef.toLowerCase().includes(q)
      );
    }

    const total = history.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;
    const data = history.slice(start, start + limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }
}

/**
 * Exchange OAuth authorization code for connection session
 * TODO: Connect to Shalvi's backend API endpoint POST /api/v1/integrations/callback
 */
export async function handleOAuthCallback(params: OAuthCallbackParams): Promise<{ message: string; provider?: string }> {
  try {
    const response = await apiClient.post<{ message: string; provider?: string }>('/integrations/callback', params);
    return response.data;
  } catch {
    if (params.error) {
      throw new Error(params.error || 'OAuth authorization was cancelled or failed.');
    }

    // Mock successful authorization code exchange
    const provider = params.state === 'google_drive' ? 'google_drive' : 'gmail';
    const email = provider === 'gmail' ? 'user@gmail.com' : 'user.drive@gmail.com';

    const current = getStoredIntegrations();
    const existingIndex = current.findIndex((i) => i.provider === provider);

    const newIntegration: Integration = {
      id: existingIndex >= 0 ? current[existingIndex].id : `int-${provider}-${Date.now()}`,
      provider: provider as 'gmail' | 'google_drive',
      email,
      lastScannedAt: new Date().toISOString(),
      isActive: true,
      createdAt: existingIndex >= 0 ? current[existingIndex].createdAt : new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      current[existingIndex] = newIntegration;
    } else {
      current.push(newIntegration);
    }

    setStoredIntegrations(current);

    // Add a new scan log entry indicating activation
    const history = getStoredScanHistory();
    history.unshift({
      id: `scan-${Date.now()}`,
      userId: 'usr-1',
      integrationId: newIntegration.id,
      sourceRef: 'auth-sync',
      sourceName: `${provider === 'gmail' ? 'Gmail Inbox' : 'Google Drive Root'} Initial Scan`,
      action: 'detected',
      createdAt: new Date().toISOString(),
      details: 'Connected account successfully verified. Auto-scan activated.',
    });
    setStoredScanHistory(history);

    return {
      message: `${provider === 'gmail' ? 'Gmail' : 'Google Drive'} account connected successfully!`,
      provider,
    };
  }
}
