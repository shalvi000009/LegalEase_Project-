import { useEffect } from 'react';
import { useDateStore } from '../store/dateStore';

export function useReminders(autoRefresh = true) {
  const {
    reminders,
    isLoadingReminders,
    error,
    fetchReminders,
    snoozeReminder,
    resolveReminder,
  } = useDateStore();

  useEffect(() => {
    fetchReminders();

    if (autoRefresh) {
      // Refresh every 5 minutes
      const interval = setInterval(() => {
        fetchReminders();
      }, 5 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [fetchReminders, autoRefresh]);

  const activeReminders = reminders.filter((r) => r.status !== 'resolved');

  return {
    reminders: activeReminders,
    allReminders: reminders,
    isLoading: isLoadingReminders,
    error,
    snoozeReminder,
    resolveReminder,
    refetch: fetchReminders,
  };
}
