import { create } from 'zustand';
import { Integration, ScanLogEntry, ScanHistoryFilters } from '../types/integrations';
import {
  getIntegrations,
  disconnectIntegration,
  getScanHistory,
} from '../api/integrations';
import toast from 'react-hot-toast';

interface IntegrationState {
  integrations: Integration[];
  scanHistory: ScanLogEntry[];
  isConnecting: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setIntegrations: (integrations: Integration[]) => void;
  addIntegration: (integration: Integration) => void;
  removeIntegration: (id: string) => Promise<void>;
  setScanHistory: (history: ScanLogEntry[]) => void;
  addScanLog: (entry: ScanLogEntry) => void;
  setIsConnecting: (connecting: boolean) => void;
  fetchIntegrations: () => Promise<void>;
  fetchScanHistory: (filters?: ScanHistoryFilters) => Promise<void>;
}

export const useIntegrationStore = create<IntegrationState>((set) => ({
  integrations: [],
  scanHistory: [],
  isConnecting: false,
  isLoading: false,
  error: null,

  setIntegrations: (integrations) => set({ integrations }),

  addIntegration: (newInt) =>
    set((state) => {
      const exists = state.integrations.some((i) => i.id === newInt.id || i.provider === newInt.provider);
      if (exists) {
        return {
          integrations: state.integrations.map((i) =>
            i.provider === newInt.provider ? newInt : i
          ),
        };
      }
      return { integrations: [...state.integrations, newInt] };
    }),

  removeIntegration: async (id: string) => {
    try {
      await disconnectIntegration(id);
      set((state) => ({
        integrations: state.integrations.filter((item) => item.id !== id),
      }));
      toast.success('Account disconnected successfully');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to disconnect account';
      toast.error(msg);
    }
  },

  setScanHistory: (scanHistory) => set({ scanHistory }),

  addScanLog: (entry) =>
    set((state) => ({
      scanHistory: [entry, ...state.scanHistory],
    })),

  setIsConnecting: (isConnecting) => set({ isConnecting }),

  fetchIntegrations: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await getIntegrations();
      set({ integrations: data, isLoading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load integrations';
      set({ error: message, isLoading: false });
    }
  },

  fetchScanHistory: async (filters?: ScanHistoryFilters) => {
    try {
      const res = await getScanHistory(1, 50, filters);
      set({ scanHistory: res.data });
    } catch (err: unknown) {
      console.error('Error fetching scan history:', err);
    }
  },
}));
