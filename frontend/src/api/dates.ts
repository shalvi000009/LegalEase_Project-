import axios from 'axios';
import { ContractDate } from '../types/dates';

// Backend API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// TODO: Replace with real API calls once Shalvi's backend CRUD endpoints are ready
const MOCK_DATES_STORE: Record<string, ContractDate[]> = {
  'doc-1': [
    {
      id: 'd1',
      docId: 'doc-1',
      dateType: 'expiry_date',
      rawText: 'expires on 31st March 2026',
      resolvedDate: '2026-03-31',
      confidence: 0.94,
      userConfirmed: false,
      isActive: true,
    },
    {
      id: 'd2',
      docId: 'doc-1',
      dateType: 'notice_deadline',
      rawText: '30 days written notice prior to expiration',
      resolvedDate: '2026-02-28',
      confidence: 0.87,
      userConfirmed: false,
      isActive: true,
    },
    {
      id: 'd3',
      docId: 'doc-1',
      dateType: 'payment_due',
      rawText: 'monthly retainer due on the 5th of each month',
      resolvedDate: '2026-04-05',
      confidence: 0.65,
      userConfirmed: false,
      isActive: true,
    }
  ],
  'doc-2': [
    {
      id: 'd4',
      docId: 'doc-2',
      dateType: 'expiry_date',
      rawText: 'lease agreement terminates on 15th February 2025',
      resolvedDate: '2025-02-15',
      confidence: 0.98,
      userConfirmed: true,
      isActive: true,
    }
  ]
};

/**
 * Fetch dates for a specific document
 */
export async function getDocumentDates(docId: string): Promise<ContractDate[]> {
  try {
    const response = await axios.get(`${API_BASE_URL}/documents/${docId}/dates`);
    return response.data;
  } catch (error) {
    console.warn(`[API] Fallback to mock dates for document ${docId}:`, error);
    return MOCK_DATES_STORE[docId] || [
      {
        id: `d-${Date.now()}-1`,
        docId,
        dateType: 'expiry_date',
        rawText: 'agreement expires on 31st December 2026',
        resolvedDate: '2026-12-31',
        confidence: 0.92,
        userConfirmed: false,
        isActive: true,
      },
      {
        id: `d-${Date.now()}-2`,
        docId,
        dateType: 'notice_deadline',
        rawText: '60 days non-renewal notice required',
        resolvedDate: '2026-11-01',
        confidence: 0.78,
        userConfirmed: false,
        isActive: true,
      }
    ];
  }
}

/**
 * Update an extracted contract date
 */
export async function updateDate(
  docId: string, 
  dateId: string, 
  data: Partial<ContractDate>
): Promise<ContractDate> {
  try {
    const response = await axios.patch(`${API_BASE_URL}/documents/${docId}/dates/${dateId}`, data);
    return response.data;
  } catch (error) {
    console.warn(`[API] Fallback to mock update for date ${dateId}:`, error);
    const dates = MOCK_DATES_STORE[docId] || [];
    const index = dates.findIndex((d) => d.id === dateId);
    if (index !== -1) {
      MOCK_DATES_STORE[docId][index] = { ...dates[index], ...data };
      return MOCK_DATES_STORE[docId][index];
    }
    return {
      id: dateId,
      docId,
      dateType: data.dateType || 'other',
      rawText: data.rawText || '',
      resolvedDate: data.resolvedDate || new Date().toISOString().split('T')[0],
      confidence: data.confidence ?? 1.0,
      userConfirmed: data.userConfirmed ?? true,
      isActive: true,
    };
  }
}

/**
 * Confirm an extracted date
 */
export async function confirmDate(docId: string, dateId: string): Promise<ContractDate> {
  return updateDate(docId, dateId, { userConfirmed: true });
}

/**
 * Confirm all dates for a document
 */
export async function confirmAllDates(docId: string): Promise<ContractDate[]> {
  try {
    const response = await axios.post(`${API_BASE_URL}/documents/${docId}/dates/confirm-all`);
    return response.data;
  } catch (error) {
    console.warn(`[API] Fallback to mock confirm all dates for document ${docId}:`, error);
    const dates = await getDocumentDates(docId);
    const updated = dates.map(d => ({ ...d, userConfirmed: true }));
    MOCK_DATES_STORE[docId] = updated;
    return updated;
  }
}

/**
 * Delete a date entry
 */
export async function deleteDate(docId: string, dateId: string): Promise<void> {
  try {
    await axios.delete(`${API_BASE_URL}/documents/${docId}/dates/${dateId}`);
  } catch (error) {
    console.warn(`[API] Fallback to mock delete for date ${dateId}:`, error);
    if (MOCK_DATES_STORE[docId]) {
      MOCK_DATES_STORE[docId] = MOCK_DATES_STORE[docId].filter((d) => d.id !== dateId);
    }
  }
}

/**
 * Manually add a missing date to a document
 */
export async function addDate(
  docId: string, 
  newDate: Omit<ContractDate, 'id' | 'docId' | 'userConfirmed' | 'isActive'>
): Promise<ContractDate> {
  try {
    const response = await axios.post(`${API_BASE_URL}/documents/${docId}/dates`, newDate);
    return response.data;
  } catch (error) {
    console.warn(`[API] Fallback to mock add date for document ${docId}:`, error);
    const created: ContractDate = {
      ...newDate,
      id: `d-user-${Date.now()}`,
      docId,
      userConfirmed: true,
      isActive: true,
    };
    if (!MOCK_DATES_STORE[docId]) {
      MOCK_DATES_STORE[docId] = [];
    }
    MOCK_DATES_STORE[docId].push(created);
    return created;
  }
}
