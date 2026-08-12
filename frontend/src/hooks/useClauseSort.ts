import { useState, useMemo } from 'react';
import { Clause } from '../types/analysis';

export type SortOption = 'risk-desc' | 'risk-asc' | 'type' | 'page';

export function useClauseSort(clauses: Clause[] = []) {
  const [sortOption, setSortOption] = useState<SortOption>('risk-desc');

  const sortedClauses = useMemo(() => {
    const list = [...clauses];

    switch (sortOption) {
      case 'risk-desc':
        return list.sort((a, b) => b.risk_score - a.risk_score);
      case 'risk-asc':
        return list.sort((a, b) => a.risk_score - b.risk_score);
      case 'type':
        return list.sort((a, b) => a.clause_type.localeCompare(b.clause_type));
      case 'page':
        return list.sort((a, b) => (a.page_number || 0) - (b.page_number || 0));
      default:
        return list;
    }
  }, [clauses, sortOption]);

  return {
    sortedClauses,
    sortOption,
    setSortOption,
  };
}
