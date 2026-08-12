import { create } from 'zustand';
import { AnalysisResult } from '../types/analysis';
import { getDocumentAnalysis } from '../api/analysis';

const SESSION_STORAGE_KEY = 'legalease_current_analysis';

function getInitialState(): AnalysisResult | null {
  try {
    const cached = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.warn('Failed to load analysis from sessionStorage:', e);
  }
  return null;
}

function saveToSessionStorage(data: AnalysisResult | null) {
  try {
    if (data) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
    } else {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch (e) {
    console.warn('Failed to save analysis to sessionStorage:', e);
  }
}

interface AnalysisState {
  currentAnalysis: AnalysisResult | null;
  analysisHistory: AnalysisResult[];
  isLoading: boolean;
  error: string | null;

  setCurrentAnalysis: (result: AnalysisResult | null) => void;
  clearCurrentAnalysis: () => void;
  fetchAnalysis: (docId: string) => Promise<AnalysisResult>;
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  currentAnalysis: getInitialState(),
  analysisHistory: [],
  isLoading: false,
  error: null,

  setCurrentAnalysis: (result: AnalysisResult | null) => {
    saveToSessionStorage(result);
    set((state) => {
      const updatedHistory = result
        ? [result, ...state.analysisHistory.filter((h) => h.doc_id !== result.doc_id)]
        : state.analysisHistory;

      return {
        currentAnalysis: result,
        analysisHistory: updatedHistory,
      };
    });
  },

  clearCurrentAnalysis: () => {
    saveToSessionStorage(null);
    set({ currentAnalysis: null, error: null });
  },

  fetchAnalysis: async (docId: string) => {
    const existing = get().currentAnalysis;
    if (existing && existing.doc_id === docId) {
      return existing;
    }

    set({ isLoading: true, error: null });
    try {
      const data = await getDocumentAnalysis(docId);
      get().setCurrentAnalysis(data);
      set({ isLoading: false });
      return data;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch contract analysis';
      set({ isLoading: false, error: errorMsg });
      throw err;
    }
  },
}));
