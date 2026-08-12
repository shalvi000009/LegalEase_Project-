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

interface DocumentStore {
  currentUpload: CurrentUploadState | null;
  recentDocuments: Document[];
  
  // Actions
  setCurrentUpload: (upload: CurrentUploadState | null) => void;
  setUploadProgress: (progress: number) => void;
  setUploadStatus: (status: DocumentStatus, error?: string | null) => void;
  setUploadDocId: (docId: string) => void;
  addRecentDocument: (doc: Document) => void;
  clearCurrentUpload: () => void;
}

export const useDocumentStore = create<DocumentStore>()(
  persist(
    (set) => ({
      currentUpload: null,
      recentDocuments: [],

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
    }),
    {
      name: 'legalease_recent_documents',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ recentDocuments: state.recentDocuments }),
    }
  )
);
