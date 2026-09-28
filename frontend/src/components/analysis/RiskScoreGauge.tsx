import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RiskLevel } from '../../types/analysis';

export interface RiskScoreGaugeProps {
  score: number; // 0 - 100
  riskLevel?: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const RiskScoreGauge: React.FC<RiskScoreGaugeProps> = ({
  score,
  riskLevel,
  size = 'md',
  className = '',
}) => {
  const clampedScore = Math.min(100, Math.max(0, Math.round(score)));
  const [animatedScore, setAnimatedScore] = useState(0);

  // Determine risk category color configuration
  let color = '#10b981'; // Green
  let strokeGradient = 'url(#gradient-success)';
  let glowColor = 'rgba(16, 185, 129, 0.4)';
  let levelText = 'Low Risk';

  if (clampedScore > 70 || riskLevel === 'high') {
    color = '#ef4444'; // Red
    strokeGradient = 'url(#gradient-danger)';
    glowColor = 'rgba(239, 68, 68, 0.4)';
    levelText = 'High Risk';
  } else if (clampedScore > 40 || riskLevel === 'medium') {
    color = '#f59e0b'; // Amber
    strokeGradient = 'url(#gradient-warning)';
    glowColor = 'rgba(245, 158, 11, 0.4)';
    levelText = 'Medium Risk';
  }

  // 1.5s Animated counter effect
  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 1500; // ms

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease-out cubic formula
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.floor(easedProgress * clampedScore));

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [clampedScore]);

  // SVG Gauge Geometry Constants
  const radius = 70;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius; // ~439.8
  const offset = circumference - (clampedScore / 100) * circumference;

  const dimensionClass =
    size === 'sm'
      ? 'w-[120px] h-[120px]'
      : size === 'lg'
      ? 'w-[220px] h-[220px]'
      : 'w-[150px] h-[150px] sm:w-[200px] sm:h-[200px]';

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clampedScore}
      aria-label={`Contract Risk Score Gauge: ${clampedScore} out of 100 (${levelText})`}
      className={`relative flex flex-col items-center justify-center ${className}`}
    >
      {/* SVG Container */}
      <div className="relative flex items-center justify-center">
        {/* Glow Shadow Ring Overlay */}
        <div
          style={{ boxShadow: `0 0 40px ${glowColor}` }}
          className="absolute inset-2 rounded-full pointer-events-none transition-all duration-700 animate-pulse"
        />

        <svg
          className={`${dimensionClass} transform -rotate-90`}
          viewBox="0 0 160 160"
        >
          <defs>
            {/* Green Gradient */}
            <linearGradient id="gradient-success" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            {/* Amber Gradient */}
            <linearGradient id="gradient-warning" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            {/* Red Gradient */}
            <linearGradient id="gradient-danger" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
          </defs>

          {/* Background Track Circle */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-slate-200 dark:text-slate-800"
          />

          {/* Animated Foreground Arc */}
          <motion.circle
            cx="80"
            cy="80"
            r={radius}
            stroke={strokeGradient}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>

        {/* Center Animated Score Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-slate-100 font-mono"
          >
            {animatedScore}
          </motion.span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-0.5">
            / 100 Score
          </span>
        </div>
      </div>

      {/* Risk Category Text Label Below */}
      <div className="mt-3 text-center">
        <span
          style={{ color }}
          className="text-sm sm:text-base font-extrabold tracking-wide uppercase px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm inline-flex items-center gap-1.5"
        >
          <span
            className="w-2 h-2 rounded-full animate-ping"
            style={{ backgroundColor: color }}
          />
          {levelText}
        </span>
      </div>
    </div>
  );
};
