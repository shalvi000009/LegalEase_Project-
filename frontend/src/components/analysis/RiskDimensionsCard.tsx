import React from 'react';
import { Shield, DollarSign, Scale, Lock, UserCheck, Activity } from 'lucide-react';
import { Card } from '../ui/Card';
import { RiskDimensions } from '../../types/analysis';

interface RiskDimensionsCardProps {
  riskDimensions?: RiskDimensions;
}

const DIMENSION_CONFIG: Record<string, { label: string; icon: React.ReactNode; weight: string; description: string }> = {
  legal: {
    label: 'Legal Liability',
    icon: <Scale className="w-4 h-4 text-indigo-500" />,
    weight: '30% Weight',
    description: 'Uncapped liability, ambiguous jurisdiction & unilateral termination terms.',
  },
  financial: {
    label: 'Financial Exposure',
    icon: <DollarSign className="w-4 h-4 text-emerald-500" />,
    weight: '25% Weight',
    description: 'Payment terms, penalty clauses, price escalations & indemnification.',
  },
  litigation: {
    label: 'Litigation Risk',
    icon: <Activity className="w-4 h-4 text-amber-500" />,
    weight: '20% Weight',
    description: 'Out-of-state governing law, dispute resolution & arbitration requirements.',
  },
  privacy: {
    label: 'Privacy & Data',
    icon: <Lock className="w-4 h-4 text-purple-500" />,
    weight: '15% Weight',
    description: 'Confidentiality scope, data processing rights & non-disclosure rules.',
  },
  employment: {
    label: 'Employment Restrictions',
    icon: <UserCheck className="w-4 h-4 text-sky-500" />,
    weight: '10% Weight',
    description: 'Non-compete, non-solicit & post-employment duration restrictions.',
  },
};

export const RiskDimensionsCard: React.FC<RiskDimensionsCardProps> = ({ riskDimensions }) => {
  if (!riskDimensions) return null;

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'bg-red-500 text-red-500';
    if (score >= 40) return 'bg-amber-500 text-amber-500';
    return 'bg-emerald-500 text-emerald-500';
  };

  const getBadgeStyle = (score: number) => {
    if (score >= 70) return 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-900';
    if (score >= 40) return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900';
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900';
  };

  const getRiskLabel = (score: number) => {
    if (score >= 70) return 'High Risk';
    if (score >= 40) return 'Medium Risk';
    return 'Low Risk';
  };

  return (
    <Card className="p-6 space-y-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              Multi-Dimensional Risk Breakdown
            </h3>
            <p className="text-[11px] text-slate-400">
              Contract risk analyzed across 5 core legal dimensions (Week 10 Model)
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(DIMENSION_CONFIG).map(([key, config]) => {
          const score = typeof riskDimensions[key] === 'number' ? Math.round(riskDimensions[key]) : 30;
          const colorClass = getRiskColor(score);
          const badgeStyle = getBadgeStyle(score);

          return (
            <div key={key} className="space-y-1.5 p-3 rounded-2xl bg-slate-50/60 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2">
                  {config.icon}
                  <span className="text-slate-800 dark:text-slate-200">{config.label}</span>
                  <span className="text-[10px] text-slate-400 font-normal">({config.weight})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeStyle}`}>
                    {getRiskLabel(score)}
                  </span>
                  <span className="font-mono text-xs font-extrabold text-slate-900 dark:text-slate-100 w-8 text-right">
                    {score}%
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-700 rounded-full ${colorClass.split(' ')[0]}`}
                  style={{ width: `${Math.min(100, Math.max(5, score))}%` }}
                />
              </div>

              <p className="text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                {config.description}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
