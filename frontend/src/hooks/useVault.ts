import { useMemo } from 'react';
import { useVaultStore } from '../store/vaultStore';

export function useVault() {
  const {
    contracts,
    filters,
    isLoading,
    error,
    updateContractStatus,
    deleteContract,
    setFilters,
    resetFilters,
    toggleViewMode,
  } = useVaultStore();

  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      // Search filter
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(query);
        const matchesType = (c.documentType || '').toLowerCase().includes(query);
        if (!matchesName && !matchesType) return false;
      }

      // Status filter
      if (filters.status !== 'all' && c.status !== filters.status) {
        return false;
      }

      // Date range filter
      if (filters.dateRange.from && c.expiryDate < filters.dateRange.from) {
        return false;
      }
      if (filters.dateRange.to && c.expiryDate > filters.dateRange.to) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      const orderModifier = filters.sortOrder === 'asc' ? 1 : -1;
      if (filters.sortBy === 'name') {
        return a.name.localeCompare(b.name) * orderModifier;
      }
      if (filters.sortBy === 'expiryDate') {
        return (new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()) * orderModifier;
      }
      if (filters.sortBy === 'riskScore') {
        return (a.riskScore - b.riskScore) * orderModifier;
      }
      if (filters.sortBy === 'uploadDate') {
        const dateA = a.uploadDate || '';
        const dateB = b.uploadDate || '';
        return dateA.localeCompare(dateB) * orderModifier;
      }
      return 0;
    });
  }, [contracts, filters]);

  const stats = useMemo(() => {
    const total = contracts.length;
    const active = contracts.filter((c) => c.status === 'active' || c.status === 'renewed').length;
    const expiringSoon = contracts.filter((c) => c.status === 'expiring_soon' || (c.daysRemaining > 0 && c.daysRemaining <= 30)).length;
    const expired = contracts.filter((c) => c.status === 'expired' || c.daysRemaining <= 0).length;

    return { total, active, expiringSoon, expired };
  }, [contracts]);

  return {
    contracts: filteredContracts,
    allContracts: contracts,
    stats,
    filters,
    isLoading,
    error,
    updateContractStatus,
    deleteContract,
    setFilters,
    resetFilters,
    toggleViewMode,
  };
}
