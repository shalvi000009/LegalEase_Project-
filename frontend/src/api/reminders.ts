import axios from 'axios';
import { Reminder } from '../types/dates';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// TODO: Replace with real API calls once Shalvi's reminder endpoints are ready
let MOCK_REMINDERS: Reminder[] = [
  {
    id: 'rem-1',
    userId: 'user-1',
    contractDateId: 'd1',
    contractId: 'doc-1',
    contractName: 'Employment Agreement',
    dateType: 'expiry_date',
    resolvedDate: '2026-03-31',
    daysBefore: 30,
    scheduledFor: '2026-03-01',
    status: 'pending',
    channel: 'email',
  },
  {
    id: 'rem-2',
    userId: 'user-1',
    contractDateId: 'd2',
    contractId: 'doc-1',
    contractName: 'Employment Agreement',
    dateType: 'notice_deadline',
    resolvedDate: '2026-02-28',
    daysBefore: 14,
    scheduledFor: '2026-02-14',
    status: 'pending',
    channel: 'email',
  },
  {
    id: 'rem-3',
    userId: 'user-1',
    contractDateId: 'd4',
    contractId: 'doc-2',
    contractName: 'Rental Agreement',
    dateType: 'expiry_date',
    resolvedDate: '2025-02-15',
    daysBefore: 7,
    scheduledFor: '2025-02-08',
    status: 'pending',
    channel: 'email',
  },
  {
    id: 'rem-4',
    userId: 'user-1',
    contractDateId: 'd5',
    contractId: 'doc-3',
    contractName: 'SaaS Service Level Agreement',
    dateType: 'renewal_date',
    resolvedDate: '2026-06-30',
    daysBefore: 60,
    scheduledFor: '2026-04-30',
    status: 'pending',
    channel: 'email',
  }
];

/**
 * Get user reminders
 */
export async function getReminders(): Promise<Reminder[]> {
  try {
    const response = await axios.get(`${API_BASE_URL}/reminders`);
    return response.data;
  } catch (error) {
    console.warn('[API] Fallback to mock reminders:', error);
    return MOCK_REMINDERS;
  }
}

/**
 * Snooze a reminder by N days
 */
export async function snoozeReminder(id: string, days: number): Promise<Reminder> {
  try {
    const response = await axios.post(`${API_BASE_URL}/reminders/${id}/snooze`, { days });
    return response.data;
  } catch (error) {
    console.warn(`[API] Fallback to mock snooze for reminder ${id}:`, error);
    const index = MOCK_REMINDERS.findIndex((r) => r.id === id);
    if (index !== -1) {
      const snoozedDate = new Date();
      snoozedDate.setDate(snoozedDate.getDate() + days);
      MOCK_REMINDERS[index] = {
        ...MOCK_REMINDERS[index],
        status: 'snoozed',
        snoozedUntil: snoozedDate.toISOString().split('T')[0],
      };
      return MOCK_REMINDERS[index];
    }
    throw new Error('Reminder not found');
  }
}

/**
 * Mark a reminder as resolved
 */
export async function resolveReminder(id: string): Promise<Reminder> {
  try {
    const response = await axios.post(`${API_BASE_URL}/reminders/${id}/resolve`);
    return response.data;
  } catch (error) {
    console.warn(`[API] Fallback to mock resolve for reminder ${id}:`, error);
    const index = MOCK_REMINDERS.findIndex((r) => r.id === id);
    if (index !== -1) {
      MOCK_REMINDERS[index] = {
        ...MOCK_REMINDERS[index],
        status: 'resolved',
      };
      return MOCK_REMINDERS[index];
    }
    throw new Error('Reminder not found');
  }
}

/**
 * Export reminders calendar in .ics format
 */
export async function exportCalendar(): Promise<Blob> {
  try {
    const response = await axios.get(`${API_BASE_URL}/reminders/calendar.ics`, {
      responseType: 'blob',
    });
    return response.data;
  } catch (error) {
    console.warn('[API] Generating client-side mock iCal file:', error);
    
    // Generate basic standard iCal string
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//LegalEase Contract Deadlines//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:LegalEase Contract Deadlines',
      ...MOCK_REMINDERS.map((rem) => {
        const dateStr = (rem.resolvedDate || '2026-03-31').replace(/-/g, '');
        const summary = `[LegalEase] ${rem.contractName || 'Contract'} - ${rem.dateType || 'Deadline'}`;
        return [
          'BEGIN:VEVENT',
          `UID:${rem.id}@legalease.app`,
          `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
          `DTSTART;VALUE=DATE:${dateStr}`,
          `SUMMARY:${summary}`,
          `DESCRIPTION:LegalEase contract deadline for ${rem.contractName || 'Contract'}. Scheduled reminder on ${rem.scheduledFor}.`,
          'STATUS:CONFIRMED',
          'END:VEVENT'
        ].join('\r\n');
      }),
      'END:VCALENDAR'
    ].join('\r\n');

    return new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  }
}
