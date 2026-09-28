import { apiClient } from './client';
import { ContractDate } from '../types/dates';

function transformDate(d: any): ContractDate {
  return {
    id: d.id,
    docId: d.doc_id || d.docId,
    dateType: d.date_type || d.dateType || 'other',
    rawText: d.raw_text || d.rawText || '',
    resolvedDate: d.resolved_date ? new Date(d.resolved_date).toISOString().split('T')[0] : (d.resolvedDate || ''),
    confidence: d.confidence ?? 0.9,
    userConfirmed: d.user_confirmed ?? d.userConfirmed ?? false,
    isActive: d.is_active ?? d.isActive ?? true,
  };
}

/**
 * Fetch dates for a specific document
 */
export async function getDocumentDates(docId: string): Promise<ContractDate[]> {
  const response = await apiClient.get(`/documents/${docId}/dates`);
  const data = response.data;
  const rawList = Array.isArray(data) ? data : data.dates || [];
  return rawList.map(transformDate);
}

/**
 * Update an extracted contract date
 */
export async function updateDate(
  docId: string,
  dateId: string,
  data: Partial<ContractDate>
): Promise<ContractDate> {
  const payload: any = {};
  if (data.dateType !== undefined) payload.date_type = data.dateType;
  if (data.rawText !== undefined) payload.raw_text = data.rawText;
  if (data.resolvedDate !== undefined) payload.resolved_date = data.resolvedDate;
  if (data.userConfirmed !== undefined) payload.user_confirmed = data.userConfirmed;

  const response = await apiClient.patch(`/documents/${docId}/dates/${dateId}`, payload);
  return transformDate(response.data.date || response.data);
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
  const response = await apiClient.post(`/documents/${docId}/dates/confirm-all`);
  const rawList = Array.isArray(response.data) ? response.data : response.data.dates || [];
  return rawList.map(transformDate);
}

/**
 * Delete a date entry
 */
export async function deleteDate(docId: string, dateId: string): Promise<void> {
  await apiClient.delete(`/documents/${docId}/dates/${dateId}`);
}

/**
 * Manually add a missing date to a document
 */
export async function addDate(
  docId: string,
  newDate: Omit<ContractDate, 'id' | 'docId' | 'userConfirmed' | 'isActive'>
): Promise<ContractDate> {
  const response = await apiClient.post(`/documents/${docId}/dates`, {
    date_type: newDate.dateType,
    raw_text: newDate.rawText,
    resolved_date: newDate.resolvedDate,
    confidence: newDate.confidence ?? 1.0,
  });
  return transformDate(response.data.date || response.data);
}
