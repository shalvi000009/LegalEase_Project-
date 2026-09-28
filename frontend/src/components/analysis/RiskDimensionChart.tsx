import React, { useState } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { motion } from 'framer-motion';
import { Shield, BarChart2, PieChart } from 'lucide-react';
import {
  RiskDimensions,
  RiskDimensionKey,
  DIMENSION_LABELS,
  DIMENSION_WEIGHTS,
} from '../../types/analysis';

interface RiskDimensionChartProps {
  dimensions?: RiskDimensions;
  className?: string;
}

const DEFAULT_DIMENSIONS: RiskDimensions = {
  legal: 75,
  financial: 70,
  litigation: 65,
  privacy: 60,
  employment: 80,
};

const getDimensionColor = (score: number) => {
  if (score > 70) return { bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-900/50', fill: '#ef4444' };
  if (score > 40) return { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-900/50', fill: '#f59e0b' };
  return { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-900/50', fill: '#10b981' };
};

export const RiskDimensionChart: React.FC<RiskDimensionChartProps> = ({
  dimensions = DEFAULT_DIMENSIONS,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<'radar' | 'bar'>('radar');

  const dimensionKeys: RiskDimensionKey[] = ['legal', 'financial', 'litigation', 'privacy', 'employment'];

  const chartData = dimensionKeys.map((key) => {
    const score = Math.min(100, Math.max(0, Math.round(dimensions[key] ?? 50)));
    const weight = Math.round(DIMENSION_WEIGHTS[key] * 100);
    return {
      dimension: DIMENSION_LABELS[key],
      key,
      score,
      weight: `${weight}%`,
      fullMark: 100,
    };
  });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className={`bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Risk Dimensions Breakdown
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              Weighted breakdown across 5 key risk vectors
            </p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setViewMode('radar')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
              viewMode === 'radar'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            Radar
          </button>
          <button
            type="button"
            onClick={() => setViewMode('bar')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
              viewMode === 'bar'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Bars
          </button>
        </div>
      </div>

      {/* Main Chart Body */}
      {viewMode === 'radar' ? (
        <div className="h-[220px] w-full flex items-center justify-center relative">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="72%" data={chartData}>
              <PolarGrid stroke="#cbd5e1" strokeDasharray="3 3" className="dark:stroke-slate-700" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
              />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
              <Radar
                name="Risk Score"
                dataKey="score"
                stroke="#6366f1"
                fill="#818cf8"
                fillOpacity={0.45}
                strokeWidth={2}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const style = getDimensionColor(data.score);
                    return (
                      <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-xl border border-slate-700 space-y-1">
                        <p className="font-bold flex items-center justify-between gap-3">
                          <span>{data.dimension}</span>
                          <span className="text-[10px] text-slate-400">Weight: {data.weight}</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-extrabold ${style.bg} ${style.text}`}>
                            Score: {data.score}/100
                          </span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="space-y-2.5 py-1">
          {chartData.map((item) => {
            const style = getDimensionColor(item.score);
            return (
              <div key={item.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    {item.dimension}
                    <span className="text-[10px] text-slate-400 font-normal">({item.weight} weight)</span>
                  </span>
                  <span className={`font-mono font-bold ${style.text}`}>{item.score}/100</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.score}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: style.fill }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Grid of Dimension Pills */}
      <div className="grid grid-cols-5 gap-1.5 pt-1">
        {chartData.map((item) => {
          const style = getDimensionColor(item.score);
          return (
            <div
              key={item.key}
              className={`p-1.5 rounded-xl border text-center ${style.bg} ${style.border}`}
            >
              <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-tight block truncate">
                {item.dimension}
              </span>
              <span className={`text-xs font-black font-mono ${style.text}`}>
                {item.score}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
