import React, { useRef, useState, useEffect } from 'react';
import { Page as ReactPdfPage } from 'react-pdf';
import { HighlightOverlay, HighlightRegion } from './HighlightOverlay';

interface PDFPageProps {
  pageNumber: number;
  scale: number;
  rotation?: number;
  highlights?: HighlightRegion[];
  selectedClauseId?: string | null;
  onSelectHighlight?: (clauseId: string) => void;
  onPageRenderSuccess?: (pageDimensions: { width: number; height: number }) => void;
  useFallbackCanvas?: boolean;
  sampleText?: string;
}

export const PDFPage: React.FC<PDFPageProps> = ({
  pageNumber,
  scale,
  rotation = 0,
  highlights = [],
  selectedClauseId,
  onSelectHighlight,
  onPageRenderSuccess,
  useFallbackCanvas = false,
  sampleText,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 612 * scale,
    height: 792 * scale,
  });

  useEffect(() => {
    // Base A4 size scaled
    const baseW = 612 * scale;
    const baseH = 792 * scale;
    setDimensions({ width: baseW, height: baseH });
    onPageRenderSuccess?.({ width: baseW, height: baseH });
  }, [scale, rotation, onPageRenderSuccess]);

  return (
    <div
      id={`pdf-page-${pageNumber}`}
      ref={containerRef}
      className="relative my-6 mx-auto bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 rounded-sm transition-all duration-150"
      style={{
        width: dimensions.width,
        height: dimensions.height,
        transform: `rotate(${rotation}deg)`,
      }}
    >
      {!useFallbackCanvas ? (
        <ReactPdfPage
          pageNumber={pageNumber}
          scale={scale}
          rotate={rotation}
          renderTextLayer={true}
          renderAnnotationLayer={true}
          onLoadSuccess={(page) => {
            const w = page.width * scale;
            const h = page.height * scale;
            setDimensions({ width: w, height: h });
            onPageRenderSuccess?.({ width: w, height: h });
          }}
          className="select-text"
        />
      ) : (
        /* Fallback Document Render Mode (Crisp Legal Contract Simulation) */
        <div className="w-full h-full p-10 font-serif text-slate-800 dark:text-slate-200 flex flex-col justify-between select-text overflow-hidden">
          {/* Header */}
          <div className="border-b border-slate-300 dark:border-slate-800 pb-3 flex justify-between items-center text-xs text-slate-400 font-sans uppercase tracking-widest">
            <span>MASTER SERVICES AGREEMENT</span>
            <span>SECTION {pageNumber}</span>
          </div>

          {/* Body Content */}
          <div className="space-y-4 my-auto text-sm leading-relaxed font-normal">
            <h2 className="font-bold font-sans text-base text-slate-900 dark:text-slate-100">
              ARTICLE {pageNumber}. CLAUSES & OBLIGATIONS
            </h2>
            <p>
              {sampleText ||
                `This Master Services Agreement ("Agreement") is made effective as of the date of execution by and between Client and Provider. Both parties agree that the terms herein govern all project deliverables, payment obligations, intellectual property rights, and liability limitations.`}
            </p>
            <p>
              Except as expressly set forth herein, neither party makes any warranties, express or implied, including without limitation any implied warranties of merchantability or fitness for a particular purpose.
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 italic">
              IN WITNESS WHEREOF, the parties hereto have caused this Agreement to be executed by their duly authorized representatives as of the date set forth above.
            </p>
          </div>

          {/* Page Footer */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex justify-between items-center text-xs font-mono text-slate-400">
            <span>CONFIDENTIAL & PROPRIETARY</span>
            <span>Page {pageNumber}</span>
          </div>
        </div>
      )}

      {/* SVG Highlight Overlay Layer */}
      <HighlightOverlay
        regions={highlights}
        pageWidth={dimensions.width}
        pageHeight={dimensions.height}
        selectedClauseId={selectedClauseId}
        onSelectHighlight={onSelectHighlight}
      />
    </div>
  );
};
