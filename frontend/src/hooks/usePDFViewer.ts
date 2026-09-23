import { useState, useCallback } from 'react';
import { usePDFStore } from '../store/pdfStore';

export interface UsePDFViewerReturn {
  numPages: number;
  currentPage: number;
  zoom: number;
  rotation: number;
  loading: boolean;
  error: string | null;
  setPage: (page: number) => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  rotateClockwise: () => void;
  handleDocumentLoadSuccess: (data: { numPages: number }) => void;
  handleDocumentLoadError: (err: Error) => void;
  retry: () => void;
}

export function usePDFViewer(): UsePDFViewerReturn {
  const {
    currentPage,
    numPages,
    zoom,
    rotation,
    setCurrentPage,
    setNumPages,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    rotateClockwise,
  } = usePDFStore();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const handleDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
      setLoading(false);
      setError(null);
    },
    [setNumPages]
  );

  const handleDocumentLoadError = useCallback((err: Error) => {
    setLoading(false);
    setError(err.message || 'Failed to load PDF document');
  }, []);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
  }, []);

  return {
    numPages,
    currentPage,
    zoom,
    rotation,
    loading,
    error,
    setPage: setCurrentPage,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    rotateClockwise,
    handleDocumentLoadSuccess,
    handleDocumentLoadError,
    retry,
  };
}
