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

const MOCK_VAULT_CONTRACTS: ContractSummary[] = [
  {
    id: 'doc-1',
    name: 'Employment Contract',
    status: 'active',
    expiryDate: '2026-03-31',
    riskScore: 74,
    daysRemaining: 194,
    nextReminder: '2026-03-01',
    uploadDate: '2025-01-10',
    documentType: 'Employment',
    dateCount: 3,
  },
  {
    id: 'doc-2',
    name: 'Commercial Rental Agreement',
    status: 'expiring_soon',
    expiryDate: '2025-02-15',
    riskScore: 45,
    daysRemaining: 12,
    nextReminder: '2025-02-08',
    uploadDate: '2024-02-15',
    documentType: 'Lease / Real Estate',
    dateCount: 2,
  },
  {
    id: 'doc-3',
    name: 'SaaS Master Service Agreement',
    status: 'active',
    expiryDate: '2026-06-30',
    riskScore: 28,
    daysRemaining: 285,
    nextReminder: '2026-04-30',
    uploadDate: '2025-06-30',
    documentType: 'Service Agreement',
    dateCount: 4,
  },
  {
    id: 'doc-4',
    name: 'Vendor Procurement Agreement',
    status: 'expired',
    expiryDate: '2024-12-31',
    riskScore: 82,
    daysRemaining: -261,
    nextReminder: 'Expired',
    uploadDate: '2023-12-31',
    documentType: 'Procurement',
    dateCount: 1,
  },
  {
    id: 'doc-5',
    name: 'Software License Contract',
    status: 'renewed',
    expiryDate: '2027-01-15',
    riskScore: 15,
    daysRemaining: 484,
    nextReminder: '2026-12-15',
    uploadDate: '2024-01-15',
    documentType: 'Licensing',
    dateCount: 2,
  }
];

export const useVaultStore = create<VaultState>((set) => ({
  contracts: MOCK_VAULT_CONTRACTS,
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
