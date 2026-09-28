import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Document, DocumentStatus } from '../types/document';

export interface CurrentUploadState {
  file: File | null;
  progress: number;
  status: DocumentStatus;
  docId: string | null;
  error: string | null;
}

export type DocumentFilterStatus = 'all' | 'processing' | 'completed' | 'failed';
export type DocumentSortOption = 'newest' | 'oldest' | 'risk_high' | 'name';

interface DocumentStore {
  currentUpload: CurrentUploadState | null;
  recentDocuments: Document[];
  documents: Document[];
  searchQuery: string;
  filterStatus: DocumentFilterStatus;
  sortBy: DocumentSortOption;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  
  // Actions
  setCurrentUpload: (upload: CurrentUploadState | null) => void;
  setUploadProgress: (progress: number) => void;
  setUploadStatus: (status: DocumentStatus, error?: string | null) => void;
  setUploadDocId: (docId: string) => void;
  addRecentDocument: (doc: Document) => void;
  clearCurrentUpload: () => void;

  setDocuments: (docs: Document[]) => void;
  removeDocument: (docId: string) => void;
  setSearchQuery: (query: string) => void;
  setFilterStatus: (status: DocumentFilterStatus) => void;
  setSortBy: (sort: DocumentSortOption) => void;
  setPagination: (page: number, totalPages: number, totalCount: number) => void;
}

export const useDocumentStore = create<DocumentStore>()(
  persist(
    (set) => ({
      currentUpload: null,
      recentDocuments: [],
      documents: [],
      searchQuery: '',
      filterStatus: 'all',
      sortBy: 'newest',
      currentPage: 1,
      pageSize: 9,
      totalPages: 1,
      totalCount: 0,

      setCurrentUpload: (upload) => set({ currentUpload: upload }),

      setUploadProgress: (progress) =>
        set((state) => ({
          currentUpload: state.currentUpload
            ? { ...state.currentUpload, progress: Math.min(100, Math.max(0, progress)) }
            : null,
        })),

      setUploadStatus: (status, error = null) =>
        set((state) => ({
          currentUpload: state.currentUpload
            ? { ...state.currentUpload, status, error: error ?? state.currentUpload.error }
            : null,
        })),

      setUploadDocId: (docId) =>
        set((state) => ({
          currentUpload: state.currentUpload
            ? { ...state.currentUpload, docId }
            : null,
        })),

      addRecentDocument: (doc) =>
        set((state) => {
          const filtered = state.recentDocuments.filter((d) => d.id !== doc.id);
          const updated = [doc, ...filtered].slice(0, 10);
          return { recentDocuments: updated };
        }),

      clearCurrentUpload: () => set({ currentUpload: null }),

      setDocuments: (documents) => set({ documents }),
      removeDocument: (docId) =>
        set((state) => ({
          documents: state.documents.filter((d) => d.id !== docId),
          recentDocuments: state.recentDocuments.filter((d) => d.id !== docId),
          totalCount: Math.max(0, state.totalCount - 1),
        })),
      setSearchQuery: (searchQuery) => set({ searchQuery, currentPage: 1 }),
      setFilterStatus: (filterStatus) => set({ filterStatus, currentPage: 1 }),
      setSortBy: (sortBy) => set({ sortBy }),
      setPagination: (currentPage, totalPages, totalCount) =>
        set({ currentPage, totalPages, totalCount }),
    }),
    {
      name: 'legalease_recent_documents',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ recentDocuments: state.recentDocuments }),
    }
  )
);
