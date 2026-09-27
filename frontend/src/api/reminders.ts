import { apiClient } from './client';
import { Reminder } from '../types/dates';

function transformReminder(r: any): Reminder {
  return {
    id: r.id,
    userId: r.user_id || r.userId,
    contractDateId: r.contract_date_id || r.contractDateId,
    contractId: r.contract_id || r.contractId || r.contract_date?.doc_id,
    contractName: r.contract_name || r.contractName || r.contract_date?.document?.filename || 'Contract Document',
    dateType: r.date_type || r.dateType || r.contract_date?.date_type || 'other',
    resolvedDate: r.resolved_date || r.resolvedDate || (r.contract_date?.resolved_date ? new Date(r.contract_date.resolved_date).toISOString().split('T')[0] : ''),
    daysBefore: r.days_before ?? r.daysBefore ?? 30,
    scheduledFor: r.scheduled_for ? new Date(r.scheduled_for).toISOString().split('T')[0] : (r.scheduledFor || ''),
    status: r.status || 'pending',
    snoozedUntil: r.snoozed_until || r.snoozedUntil,
    channel: r.channel || 'email',
  };
}

/**
 * Get user reminders
 */
export async function getReminders(): Promise<Reminder[]> {
  const response = await apiClient.get('/reminders');
  const rawList = Array.isArray(response.data) ? response.data : response.data.reminders || [];
  return rawList.map(transformReminder);
}

/**
 * Snooze a reminder by N days
 */
export async function snoozeReminder(id: string, days: number): Promise<Reminder> {
  const response = await apiClient.post(`/reminders/${id}/snooze`, { days });
  return transformReminder(response.data.reminder || response.data);
}

/**
 * Mark a reminder as resolved
 */
export async function resolveReminder(id: string): Promise<Reminder> {
  const response = await apiClient.post(`/reminders/${id}/resolve`);
  return transformReminder(response.data.reminder || response.data);
}

/**
 * Export reminders calendar in .ics format
 */
export async function exportCalendar(): Promise<Blob> {
  const response = await apiClient.get('/reminders/calendar.ics', {
    responseType: 'blob',
  });
  return response.data;
}
