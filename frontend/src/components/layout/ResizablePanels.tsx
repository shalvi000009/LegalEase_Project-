import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GripVertical } from 'lucide-react';
import { PanelViewMode } from '../../store/pdfStore';

interface ResizablePanelsProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  defaultSplit?: number; // 30 to 70 percentage
  activePanel?: PanelViewMode; // 'split' | 'pdf' | 'analysis'
  onSplitChange?: (split: number) => void;
}

export const ResizablePanels: React.FC<ResizablePanelsProps> = ({
  leftPanel,
  rightPanel,
  defaultSplit = 50,
  activePanel = 'split',
  onSplitChange,
}) => {
  const [splitPercent, setSplitPercent] = useState<number>(defaultSplit);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag movement handler
  const handleMove = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const offsetX = clientX - rect.left;
      const newPercent = (offsetX / rect.width) * 100;

      // Clamp between 25% and 75%
      const clamped = Math.max(25, Math.min(75, newPercent));
      setSplitPercent(clamped);
      onSplitChange?.(clamped);
    },
    [onSplitChange]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleTouchStart = () => {
    setIsDragging(true);
  };

  // Double click resets to exact 50/50 split
  const handleDoubleClick = () => {
    setSplitPercent(50);
    onSplitChange?.(50);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleMove(e.clientX);
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches.length > 0) {
        handleMove(e.touches[0].clientX);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMove]);

  // Determine active panel widths depending on activePanel prop
  let leftWidth = `${splitPercent}%`;
  let rightWidth = `${100 - splitPercent}%`;
  let showLeft = true;
  let showRight = true;

  if (activePanel === 'pdf') {
    leftWidth = '100%';
    rightWidth = '0%';
    showRight = false;
  } else if (activePanel === 'analysis') {
    leftWidth = '0%';
    rightWidth = '100%';
    showLeft = false;
  }

  return (
    <div
      ref={containerRef}
      className="flex w-full h-[calc(100vh-140px)] min-h-[600px] relative overflow-hidden select-none"
    >
      {/* Left Panel (PDF Viewer) */}
      {showLeft && (
        <div
          className="h-full overflow-hidden transition-all duration-75"
          style={{ width: leftWidth }}
        >
          {leftPanel}
        </div>
      )}

      {/* Resizable Drag Handle (Divider) */}
      {activePanel === 'split' && (
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onDoubleClick={handleDoubleClick}
          className={`w-3 hover:w-4 -mx-1.5 z-30 cursor-col-resize flex items-center justify-center group transition-all ${
            isDragging ? 'bg-indigo-500/20' : ''
          }`}
          title="Drag to resize panels (Double click to reset to 50/50)"
        >
          <div
            className={`w-1.5 h-12 rounded-full flex items-center justify-center transition-all ${
              isDragging
                ? 'bg-indigo-600 scale-110 shadow-lg'
                : 'bg-slate-300 dark:bg-slate-700 group-hover:bg-indigo-500'
            }`}
          >
            <GripVertical className="w-3 h-3 text-white opacity-80" />
          </div>
        </div>
      )}

      {/* Right Panel (Analysis & Clause Cards) */}
      {showRight && (
        <div
          className="h-full overflow-hidden transition-all duration-75"
          style={{ width: rightWidth }}
        >
          {rightPanel}
        </div>
      )}
    </div>
  );
};
