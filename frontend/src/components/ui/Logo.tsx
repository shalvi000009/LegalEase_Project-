import React from 'react';
import { Scale } from 'lucide-react';
import { cn } from '../../utils/cn';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
};

const iconSizes = {
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export const Logo: React.FC<LogoProps> = ({ className, iconOnly = false, size = 'md' }) => {
  return (
    <div className={cn('flex items-center gap-2 font-bold tracking-tight select-none', className)}>
      <div className="p-1.5 rounded-xl bg-[#0a1021] text-[#2ed3c7] shadow-md shadow-slate-950/20 dark:bg-[#2ed3c7] dark:text-[#0a1021]">
        <Scale className={iconSizes[size]} />
      </div>
      {!iconOnly && (
        <span className={cn(sizeClasses[size], 'font-extrabold')}>
          <span className="text-[#0a1021] dark:text-white">
            Legal
          </span>
          <span className="text-slate-800 dark:text-slate-200">Ease</span>
        </span>
      )}
    </div>
  );
};
