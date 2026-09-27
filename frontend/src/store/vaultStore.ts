import { create } from 'zustand';
import { ContractSummary, ContractStatus } from '../types/dates';

export interface VaultFilters {
  status: ContractStatus | 'all';
  search: string;
  dateRange: {
    from?: string;
    to?: string;
  };
  sortBy: 'name' | 'expiryDate' | 'riskScore' | 'uploadDate';
  sortOrder: 'asc' | 'desc';
  viewMode: 'grid' | 'list';
}

interface VaultState {
  contracts: ContractSummary[];
  filters: VaultFilters;
  isLoading: boolean;
  error: string | null;

  setContracts: (contracts: ContractSummary[]) => void;
  updateContractStatus: (id: string, status: ContractStatus) => void;
  deleteContract: (id: string) => void;
  setFilters: (filters: Partial<VaultFilters>) => void;
  resetFilters: () => void;
  toggleViewMode: () => void;
}

const INITIAL_FILTERS: VaultFilters = {
  status: 'all',
  search: '',
  dateRange: {},
  sortBy: 'expiryDate',
  sortOrder: 'asc',
  viewMode: 'grid',
};

export const useVaultStore = create<VaultState>((set) => ({
  contracts: [],
  filters: INITIAL_FILTERS,
  isLoading: false,
  error: null,

  setContracts: (contracts) => set({ contracts }),

  updateContractStatus: (id, status) => set((state) => ({
    contracts: state.contracts.map((c) => {
      if (c.id === id) {
        let updatedDays = c.daysRemaining;
        if (status === 'renewed' && c.status !== 'renewed') {
          // If marked renewed, set days remaining to positive extension
          updatedDays = Math.max(c.daysRemaining, 365);
        }
        return { ...c, status, daysRemaining: updatedDays };
      }
      return c;
    }),
  })),

  deleteContract: (id) => set((state) => ({
    contracts: state.contracts.filter((c) => c.id !== id),
  })),

  setFilters: (newFilters) => set((state) => ({
    filters: {
      ...state.filters,
      ...newFilters,
      dateRange: newFilters.dateRange 
        ? { ...state.filters.dateRange, ...newFilters.dateRange } 
        : state.filters.dateRange,
    },
  })),

  resetFilters: () => set({ filters: INITIAL_FILTERS }),

  toggleViewMode: () => set((state) => ({
    filters: {
      ...state.filters,
      viewMode: state.filters.viewMode === 'grid' ? 'list' : 'grid',
    },
  })),
}));
