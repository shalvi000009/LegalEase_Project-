import { useCallback } from 'react';
import { usePDFStore } from '../store/pdfStore';
import { Clause } from '../types/analysis';

export interface UsePDFSyncReturn {
  selectedClauseId: string | null;
  selectClause: (clauseId: string | null, pageNumber?: number) => void;
  navigateToClause: (clause: Clause) => void;
  scrollToClauseCard: (clauseId: string) => void;
  scrollToPDFPage: (pageNumber: number) => void;
}

export function usePDFSync(): UsePDFSyncReturn {
  const { selectedClauseId, selectClause: storeSelectClause, setCurrentPage } = usePDFStore();

  const scrollToClauseCard = useCallback((clauseId: string) => {
    const element = document.getElementById(`clause-card-${clauseId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const scrollToPDFPage = useCallback((pageNumber: number) => {
    setCurrentPage(pageNumber);
    const element = document.getElementById(`pdf-page-${pageNumber}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [setCurrentPage]);

  const selectClause = useCallback(
    (clauseId: string | null, pageNumber?: number) => {
      storeSelectClause(clauseId);
      if (clauseId) {
        scrollToClauseCard(clauseId);
      }
      if (pageNumber) {
        scrollToPDFPage(pageNumber);
      }
    },
    [storeSelectClause, scrollToClauseCard, scrollToPDFPage]
  );

  const navigateToClause = useCallback(
    (clause: Clause) => {
      storeSelectClause(clause.clause_id);
      if (clause.page_number) {
        scrollToPDFPage(clause.page_number);
      }
      scrollToClauseCard(clause.clause_id);
    },
    [storeSelectClause, scrollToPDFPage, scrollToClauseCard]
  );

  return {
    selectedClauseId,
    selectClause,
    navigateToClause,
    scrollToClauseCard,
    scrollToPDFPage,
  };
}
