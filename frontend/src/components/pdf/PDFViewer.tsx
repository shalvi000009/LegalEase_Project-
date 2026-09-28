import React, { useEffect, useRef, useState } from 'react';
import { Document, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import { usePDFStore } from '../../store/pdfStore';
import { PDFToolbar } from './PDFToolbar';
import { PDFThumbnailSidebar } from './PDFThumbnailSidebar';
import { PDFPage } from './PDFPage';
import { HighlightRegion } from './HighlightOverlay';
import { Clause } from '../../types/analysis';

// Setup pdf.worker.min.mjs using CDN url
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

interface PDFViewerProps {
  docId?: string;
  url?: string;
  clauses?: Clause[];
  onSelectClause?: (clauseId: string) => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  url = '',
  clauses = [],
  onSelectClause,
}) => {
  const {
    currentPage,
    numPages,
    zoom,
    rotation,
    selectedClauseId,
    isThumbnailOpen,
    setCurrentPage,
    setNumPages,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    rotateClockwise,
    toggleThumbnailSidebar,
  } = usePDFStore();

  const [loading, setLoading] = useState<boolean>(true);
  const [useFallbackMode, setUseFallbackMode] = useState<boolean>(false);

  // Touch Swipe gesture states
  const touchStartXRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Map Clauses to HighlightRegions grouped by Page Number
  const highlightsByPage: Record<number, HighlightRegion[]> = React.useMemo(() => {
    const map: Record<number, HighlightRegion[]> = {};
    clauses.forEach((clause, index) => {
      const page = clause.page_number || ((index % 3) + 1);
      if (!map[page]) map[page] = [];

      // Generate region coordinate box if not provided
      const yOffset = 120 + (index * 70) % 450;
      map[page].push({
        x: 40,
        y: yOffset,
        width: 530,
        height: 45,
        color: clause.risk_level === 'high' ? 'red' : clause.risk_level === 'medium' ? 'amber' : 'green',
        clauseId: clause.clause_id,
        clauseType: clause.clause_type,
        riskLevel: clause.risk_level,
        textSnippet: clause.original_text,
      });
    });
    return map;
  }, [clauses]);

  // Update store numPages when clauses are provided
  useEffect(() => {
    if (clauses.length > 0) {
      const maxPage = Math.max(...clauses.map((c) => c.page_number || 1), 3);
      setNumPages(maxPage);
    }
  }, [clauses, setNumPages]);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs/textareas
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) return;

      // Arrow Left / Up -> Prev Page
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setCurrentPage(currentPage - 1);
      }
      // Arrow Right / Down -> Next Page
      else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        setCurrentPage(currentPage + 1);
      }
      // Cmd/Ctrl + '+' -> Zoom In
      else if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        zoomIn();
      }
      // Cmd/Ctrl + '-' -> Zoom Out
      else if ((e.metaKey || e.ctrlKey) && e.key === '-') {
        e.preventDefault();
        zoomOut();
      }
      // Cmd/Ctrl + '0' -> Reset Zoom
      else if ((e.metaKey || e.ctrlKey) && e.key === '0') {
        e.preventDefault();
        resetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, zoomIn, zoomOut, resetZoom, setCurrentPage]);

  // Touch Swipe Handlers for Mobile Navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - touchEndX;

    // Minimum swipe threshold 50px
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentPage < numPages) {
        // Swiped left -> next page
        setCurrentPage(currentPage + 1);
      } else if (diff < 0 && currentPage > 1) {
        // Swiped right -> prev page
        setCurrentPage(currentPage - 1);
      }
    }
    touchStartXRef.current = null;
  };

  const handleFitWidth = () => {
    setZoom(1.25);
  };

  const handleDownload = () => {
    if (url) {
      window.open(url, '_blank');
    } else {
      alert('Downloading contract PDF document...');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const handleDocumentLoadError = () => {
    setLoading(false);
    setUseFallbackMode(true);
  };

  const handleSelectHighlight = (clauseId: string) => {
    usePDFStore.getState().selectClause(clauseId);
    onSelectClause?.(clauseId);
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="flex flex-col h-full bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative select-none shadow-sm"
    >
      {/* Sticky PDF Toolbar */}
      <PDFToolbar
        currentPage={currentPage}
        numPages={numPages}
        zoom={zoom}
        isThumbnailOpen={isThumbnailOpen}
        onPageChange={setCurrentPage}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onZoomReset={resetZoom}
        onZoomSelect={setZoom}
        onRotate={rotateClockwise}
        onToggleThumbnail={toggleThumbnailSidebar}
        onFitWidth={handleFitWidth}
        onDownload={handleDownload}
        onPrint={handlePrint}
      />

      {/* Main Body: Thumbnail Sidebar + Canvas Viewport */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Collapsible Thumbnail Sidebar */}
        <PDFThumbnailSidebar
          isOpen={isThumbnailOpen}
          numPages={numPages}
          currentPage={currentPage}
          highlightsByPage={highlightsByPage}
          onSelectPage={setCurrentPage}
        />

        {/* Scrollable PDF Pages Viewport */}
        <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center items-start scroll-smooth">
          {/* Loading Skeleton */}
          {loading && !useFallbackMode && (
            <div className="w-[612px] h-[792px] bg-white dark:bg-slate-900 rounded-lg p-8 shadow-xl border border-slate-200 dark:border-slate-800 animate-pulse space-y-6 my-6">
              <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
              <div className="space-y-3">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-5/6" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-4/6" />
              </div>
              <div className="h-40 bg-slate-100 dark:bg-slate-850 rounded-xl" />
            </div>
          )}

          {/* Actual react-pdf Document Render */}
          {url && !useFallbackMode ? (
            <Document
              file={url}
              onLoadSuccess={handleDocumentLoadSuccess}
              onLoadError={handleDocumentLoadError}
              loading={null}
              className="flex flex-col items-center"
            >
              <PDFPage
                pageNumber={currentPage}
                scale={zoom}
                rotation={rotation}
                highlights={highlightsByPage[currentPage] || []}
                selectedClauseId={selectedClauseId}
                onSelectHighlight={handleSelectHighlight}
              />
            </Document>
          ) : (
            /* Interactive Crisp Fallback Document Mode */
            <div className="flex flex-col items-center">
              <PDFPage
                pageNumber={currentPage}
                scale={zoom}
                rotation={rotation}
                highlights={highlightsByPage[currentPage] || []}
                selectedClauseId={selectedClauseId}
                onSelectHighlight={handleSelectHighlight}
                useFallbackCanvas={true}
                sampleText={`Clause ${currentPage}: The Customer shall indemnify, defend, and hold harmless LegalEase Corp from and against any third-party claims, liabilities, costs, or expenses arising from breach of agreement or unauthorized data transfers.`}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
