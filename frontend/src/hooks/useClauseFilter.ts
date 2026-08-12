import { useState, useMemo } from 'react';
import { Clause, RiskLevel } from '../types/analysis';

export type FilterLevel = 'all' | RiskLevel;

export function useClauseFilter(clauses: Clause[] = []) {
  const [filterLevel, setFilterLevel] = useState<FilterLevel>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const counts = useMemo(() => {
    const res = { all: clauses.length, high: 0, medium: 0, low: 0 };
    clauses.forEach((c) => {
      if (c.risk_level === 'high') res.high++;
      else if (c.risk_level === 'medium') res.medium++;
      else if (c.risk_level === 'low') res.low++;
    });
    return res;
  }, [clauses]);

  const filteredClauses = useMemo(() => {
    return clauses.filter((c) => {
      // Risk Level match
      const matchesLevel = filterLevel === 'all' || c.risk_level === filterLevel;

      // Text search match
      const query = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !query ||
        c.clause_type.toLowerCase().includes(query) ||
        c.explanation.toLowerCase().includes(query) ||
        c.original_text.toLowerCase().includes(query) ||
        (c.risk_reason && c.risk_reason.toLowerCase().includes(query));

      return matchesLevel && matchesQuery;
    });
  }, [clauses, filterLevel, searchQuery]);

  return {
    filteredClauses,
    filterLevel,
    setFilterLevel,
    searchQuery,
    setSearchQuery,
    counts,
  };
}
