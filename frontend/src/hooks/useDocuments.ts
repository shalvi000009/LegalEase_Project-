import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDocuments, deleteDocument } from '../api/documents';
import { useDocumentStore } from '../store/documentStore';
import { useState, useEffect } from 'react';

export function useDocuments() {
  const queryClient = useQueryClient();
  const {
    searchQuery,
    filterStatus,
    sortBy,
    currentPage,
    pageSize,
    setPagination,
    removeDocument,
  } = useDocumentStore();

  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

  // Debounce search by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const queryKey = ['documents', currentPage, pageSize, debouncedSearch, filterStatus, sortBy];

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await getDocuments(currentPage, pageSize, debouncedSearch, filterStatus);
      
      // Client-side sort if backend sort is not applied
      let sortedDocs = [...res.documents];
      if (sortBy === 'newest') {
        sortedDocs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } else if (sortBy === 'oldest') {
        sortedDocs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      } else if (sortBy === 'risk_high') {
        sortedDocs.sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0));
      } else if (sortBy === 'name') {
        sortedDocs.sort((a, b) => a.filename.localeCompare(b.filename));
      }

      setPagination(currentPage, res.pagination.totalPages, res.pagination.total);
      return {
        documents: sortedDocs,
        pagination: res.pagination,
      };
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      await deleteDocument(docId);
      return docId;
    },
    onSuccess: (deletedId) => {
      removeDocument(deletedId);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  return {
    documents: data?.documents || [],
    pagination: data?.pagination || { total: 0, page: 1, limit: pageSize, totalPages: 1 },
    isLoading,
    isError,
    error,
    refetch,
    deleteDocument: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
