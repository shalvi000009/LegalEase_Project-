import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Download,
  Printer,
  Sidebar,
  RotateCcw,
} from 'lucide-react';
import { Button } from '../ui/Button';

interface PDFToolbarProps {
  currentPage: number;
  numPages: number;
  zoom: number; // e.g. 1.0 = 100%
  isThumbnailOpen: boolean;
  onPageChange: (page: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onZoomSelect: (zoom: number) => void;
  onRotate: () => void;
  onToggleThumbnail: () => void;
  onFitWidth?: () => void;
  onDownload?: () => void;
  onPrint?: () => void;
}

const ZOOM_OPTIONS = [
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1.0 },
  { label: '125%', value: 1.25 },
  { label: '150%', value: 1.5 },
  { label: '200%', value: 2.0 },
];

export const PDFToolbar: React.FC<PDFToolbarProps> = ({
  currentPage,
  numPages,
  zoom,
  isThumbnailOpen,
  onPageChange,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onZoomSelect,
  onRotate,
  onToggleThumbnail,
  onFitWidth,
  onDownload,
  onPrint,
}) => {
  return (
    <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs shadow-sm">
      {/* Left Group: Sidebar Toggle & Page Navigation */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onToggleThumbnail}
          className={`p-1.5 rounded-lg border transition-colors ${
            isThumbnailOpen
              ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400'
              : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
          title="Toggle Thumbnail Sidebar"
        >
          <Sidebar className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

        {/* Page Nav */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 px-2 font-mono whitespace-nowrap">
            Page {currentPage} of {numPages || 1}
          </span>

          <button
            type="button"
            disabled={currentPage >= numPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Middle Group: Zoom & View Controls */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={zoom <= 0.5}
          onClick={onZoomOut}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* Zoom Level Select */}
        <select
          value={zoom}
          onChange={(e) => onZoomSelect(parseFloat(e.target.value))}
          className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-xs font-semibold rounded-lg px-2 py-1 border-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        >
          {ZOOM_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={zoom >= 2.0}
          onClick={onZoomIn}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onZoomReset}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Reset Zoom (100%)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {onFitWidth && (
          <button
            type="button"
            onClick={onFitWidth}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors hidden sm:block"
            title="Fit to Width"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

        <button
          type="button"
          onClick={onRotate}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Rotate 90° Clockwise"
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      {/* Right Group: Download & Print Actions */}
      <div className="flex items-center gap-1.5">
        {onPrint && (
          <button
            type="button"
            onClick={onPrint}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Print Document"
          >
            <Printer className="w-4 h-4" />
          </button>
        )}

        {onDownload && (
          <Button
            variant="outline"
            size="sm"
            onClick={onDownload}
            iconLeft={<Download className="w-3.5 h-3.5" />}
            className="h-8 text-xs"
          >
            Download
          </Button>
        )}
      </div>
    </div>
  );
};
