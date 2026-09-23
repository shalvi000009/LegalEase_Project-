import { create } from 'zustand';

export type PanelViewMode = 'split' | 'pdf' | 'analysis';

export interface PDFStoreState {
  currentPage: number;
  numPages: number;
  zoom: number; // e.g. 1.0 = 100%
  rotation: number; // 0, 90, 180, 270
  selectedClauseId: string | null;
  highlightedPages: number[];
  isThumbnailOpen: boolean;
  activePanel: PanelViewMode;

  // Actions
  setCurrentPage: (page: number) => void;
  setNumPages: (numPages: number) => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setRotation: (rotation: number) => void;
  rotateClockwise: () => void;
  selectClause: (clauseId: string | null) => void;
  clearSelection: () => void;
  setHighlightedPages: (pages: number[]) => void;
  toggleThumbnailSidebar: () => void;
  setThumbnailSidebarOpen: (isOpen: boolean) => void;
  setActivePanel: (panel: PanelViewMode) => void;
}

const ZOOM_LEVELS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export const usePDFStore = create<PDFStoreState>((set) => ({
  currentPage: 1,
  numPages: 1,
  zoom: 1.0,
  rotation: 0,
  selectedClauseId: null,
  highlightedPages: [],
  isThumbnailOpen: true,
  activePanel: 'split',

  setCurrentPage: (page) =>
    set((state) => ({
      currentPage: Math.max(1, Math.min(page, state.numPages || 1)),
    })),

  setNumPages: (numPages) =>
    set((state) => ({
      numPages: Math.max(1, numPages),
      currentPage: Math.min(state.currentPage, numPages),
    })),

  setZoom: (zoom) =>
    set(() => ({
      zoom: Math.max(0.5, Math.min(2.0, zoom)),
    })),

  zoomIn: () =>
    set((state) => {
      const nextIndex = ZOOM_LEVELS.findIndex((z) => z > state.zoom);
      const nextZoom = nextIndex !== -1 ? ZOOM_LEVELS[nextIndex] : 2.0;
      return { zoom: nextZoom };
    }),

  zoomOut: () =>
    set((state) => {
      const prevLevels = ZOOM_LEVELS.filter((z) => z < state.zoom);
      const prevZoom = prevLevels.length > 0 ? prevLevels[prevLevels.length - 1] : 0.5;
      return { zoom: prevZoom };
    }),

  resetZoom: () => set({ zoom: 1.0 }),

  setRotation: (rotation) => set({ rotation: rotation % 360 }),

  rotateClockwise: () =>
    set((state) => ({
      rotation: (state.rotation + 90) % 360,
    })),

  selectClause: (clauseId) => set({ selectedClauseId: clauseId }),

  clearSelection: () => set({ selectedClauseId: null }),

  setHighlightedPages: (pages) => set({ highlightedPages: pages }),

  toggleThumbnailSidebar: () =>
    set((state) => ({ isThumbnailOpen: !state.isThumbnailOpen })),

  setThumbnailSidebarOpen: (isOpen) => set({ isThumbnailOpen: isOpen }),

  setActivePanel: (panel) => set({ activePanel: panel }),
}));
