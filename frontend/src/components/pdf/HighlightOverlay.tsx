import React from 'react';
import { motion } from 'framer-motion';
import { ClauseType, RiskLevel } from '../../types/analysis';

export interface HighlightRegion {
  x: number; // percentage or px width ratio
  y: number;
  width: number;
  height: number;
  color?: string; // 'red' | 'amber' | 'green'
  clauseId: string;
  clauseType?: ClauseType;
  riskLevel?: RiskLevel;
  textSnippet?: string;
}

interface HighlightOverlayProps {
  regions: HighlightRegion[];
  pageWidth: number;
  pageHeight: number;
  selectedClauseId?: string | null;
  onSelectHighlight?: (clauseId: string) => void;
}

const getColorStyles = (color?: string, riskLevel?: RiskLevel) => {
  const level = color || riskLevel || 'medium';
  switch (level) {
    case 'high':
    case 'red':
      return {
        fill: 'rgba(239, 68, 68, 0.22)',
        stroke: '#ef4444',
        glow: 'rgba(239, 68, 68, 0.4)',
        badgeBg: 'bg-red-500',
      };
    case 'low':
    case 'green':
      return {
        fill: 'rgba(16, 185, 129, 0.22)',
        stroke: '#10b981',
        glow: 'rgba(16, 185, 129, 0.4)',
        badgeBg: 'bg-emerald-500',
      };
    case 'medium':
    case 'amber':
    default:
      return {
        fill: 'rgba(245, 158, 11, 0.22)',
        stroke: '#f59e0b',
        glow: 'rgba(245, 158, 11, 0.4)',
        badgeBg: 'bg-amber-500',
      };
  }
};

export const HighlightOverlay: React.FC<HighlightOverlayProps> = ({
  regions,
  pageWidth,
  pageHeight,
  selectedClauseId,
  onSelectHighlight,
}) => {
  if (!regions || regions.length === 0 || !pageWidth || !pageHeight) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 pointer-events-none z-10"
      style={{ width: pageWidth, height: pageHeight }}
    >
      <svg
        width={pageWidth}
        height={pageHeight}
        viewBox={`0 0 ${pageWidth} ${pageHeight}`}
        className="w-full h-full"
      >
        {regions.map((region) => {
          const isSelected = selectedClauseId === region.clauseId;
          const styles = getColorStyles(region.color, region.riskLevel);

          // Calculate dimensions if given as coordinates or normalized percentages
          const x = region.x <= 1 ? region.x * pageWidth : region.x;
          const y = region.y <= 1 ? region.y * pageHeight : region.y;
          const w = region.width <= 1 ? region.width * pageWidth : region.width;
          const h = region.height <= 1 ? region.height * pageHeight : region.height;

          return (
            <g key={region.clauseId} className="pointer-events-auto cursor-pointer">
              <motion.rect
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                x={x}
                y={y}
                width={w}
                height={h}
                rx={4}
                ry={4}
                fill={styles.fill}
                stroke={styles.stroke}
                strokeWidth={isSelected ? 3 : 1.5}
                strokeDasharray={isSelected ? 'none' : '4 2'}
                className="transition-all duration-200 hover:opacity-90"
                style={{
                  filter: isSelected ? `drop-shadow(0 0 8px ${styles.glow})` : undefined,
                }}
                onClick={() => onSelectHighlight?.(region.clauseId)}
              >
                <title>
                  {region.clauseType
                    ? `${String(region.clauseType).replace(/_/g, ' ').toUpperCase()} (${
                        region.riskLevel || 'risk'
                      })`
                    : `Clause: ${region.clauseId}`}
                </title>
              </motion.rect>
            </g>
          );
        })}
      </svg>

      {/* Floating indicator badges for hovered/selected highlights */}
      {regions.map((region) => {
        const isSelected = selectedClauseId === region.clauseId;
        if (!isSelected) return null;

        const x = region.x <= 1 ? region.x * pageWidth : region.x;
        const y = region.y <= 1 ? region.y * pageHeight : region.y;
        const styles = getColorStyles(region.color, region.riskLevel);

        return (
          <motion.div
            key={`badge-${region.clauseId}`}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute pointer-events-none z-20"
            style={{ left: Math.max(10, x), top: Math.max(10, y - 28) }}
          >
            <span
              className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-md shadow-md ${styles.badgeBg} flex items-center gap-1 uppercase tracking-wider`}
            >
              Active Clause: {region.clauseType || region.clauseId}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
};
