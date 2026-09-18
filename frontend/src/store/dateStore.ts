import { create } from 'zustand';
import { ContractDate, Reminder } from '../types/dates';
import * as datesApi from '../api/dates';
import * as remindersApi from '../api/reminders';

interface DateState {
  dates: Record<string, ContractDate[]>;
  reminders: Reminder[];
  isLoadingDates: boolean;
  isLoadingReminders: boolean;
  error: string | null;

  // Actions for Dates
  fetchDates: (docId: string) => Promise<ContractDate[]>;
  confirmDate: (docId: string, dateId: string) => Promise<void>;
  confirmAllDates: (docId: string) => Promise<void>;
  updateDate: (docId: string, dateId: string, data: Partial<ContractDate>) => Promise<void>;
  deleteDate: (docId: string, dateId: string) => Promise<void>;
  addDate: (docId: string, data: Omit<ContractDate, 'id' | 'docId' | 'userConfirmed' | 'isActive'>) => Promise<void>;

  // Actions for Reminders
  fetchReminders: () => Promise<Reminder[]>;
  snoozeReminder: (id: string, days: number) => Promise<void>;
  resolveReminder: (id: string) => Promise<void>;
}

export const useDateStore = create<DateState>((set) => ({
  dates: {},
  reminders: [],
  isLoadingDates: false,
  isLoadingReminders: false,
  error: null,

  fetchDates: async (docId: string) => {
    set({ isLoadingDates: true, error: null });
    try {
      const fetched = await datesApi.getDocumentDates(docId);
      set((state) => ({
        dates: { ...state.dates, [docId]: fetched },
        isLoadingDates: false,
      }));
      return fetched;
    } catch (err: any) {
      set({ error: err?.message || 'Failed to fetch dates', isLoadingDates: false });
      return [];
    }
  },

  confirmDate: async (docId: string, dateId: string) => {
    try {
      const updated = await datesApi.confirmDate(docId, dateId);
      set((state) => {
        const currentDates = state.dates[docId] || [];
        const nextDates = currentDates.map((d) => (d.id === dateId ? updated : d));
        return { dates: { ...state.dates, [docId]: nextDates } };
      });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to confirm date' });
    }
  },

  confirmAllDates: async (docId: string) => {
    try {
      const updatedList = await datesApi.confirmAllDates(docId);
      set((state) => ({
        dates: { ...state.dates, [docId]: updatedList },
      }));
    } catch (err: any) {
      set({ error: err?.message || 'Failed to confirm all dates' });
    }
  },

  updateDate: async (docId: string, dateId: string, data: Partial<ContractDate>) => {
    try {
      const updated = await datesApi.updateDate(docId, dateId, data);
      set((state) => {
        const currentDates = state.dates[docId] || [];
        const nextDates = currentDates.map((d) => (d.id === dateId ? updated : d));
        return { dates: { ...state.dates, [docId]: nextDates } };
      });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to update date' });
    }
  },

  deleteDate: async (docId: string, dateId: string) => {
    try {
      await datesApi.deleteDate(docId, dateId);
      set((state) => {
        const currentDates = state.dates[docId] || [];
        const nextDates = currentDates.filter((d) => d.id !== dateId);
        return { dates: { ...state.dates, [docId]: nextDates } };
      });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to delete date' });
    }
  },

  addDate: async (docId: string, data: Omit<ContractDate, 'id' | 'docId' | 'userConfirmed' | 'isActive'>) => {
    try {
      const created = await datesApi.addDate(docId, data);
      set((state) => {
        const currentDates = state.dates[docId] || [];
        return { dates: { ...state.dates, [docId]: [...currentDates, created] } };
      });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to add date' });
    }
  },

  fetchReminders: async () => {
    set({ isLoadingReminders: true, error: null });
    try {
      const fetched = await remindersApi.getReminders();
      set({ reminders: fetched, isLoadingReminders: false });
      return fetched;
    } catch (err: any) {
      set({ error: err?.message || 'Failed to fetch reminders', isLoadingReminders: false });
      return [];
    }
  },

  snoozeReminder: async (id: string, days: number) => {
    try {
      const snoozed = await remindersApi.snoozeReminder(id, days);
      set((state) => ({
        reminders: state.reminders.map((r) => (r.id === id ? snoozed : r)),
      }));
    } catch (err: any) {
      set({ error: err?.message || 'Failed to snooze reminder' });
    }
  },

  resolveReminder: async (id: string) => {
    try {
      const resolved = await remindersApi.resolveReminder(id);
      set((state) => ({
        reminders: state.reminders.map((r) => (r.id === id ? resolved : r)),
      }));
    } catch (err: any) {
      set({ error: err?.message || 'Failed to resolve reminder' });
    }
  },
}));
