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
      <div className="p-1.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20">
        <Scale className={iconSizes[size]} />
      </div>
      {!iconOnly && (
        <span className={cn(sizeClasses[size], 'font-extrabold')}>
          <span className="bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent dark:from-indigo-400 dark:to-indigo-300">
            Legal
          </span>
          <span className="text-slate-800 dark:text-slate-200">Ease</span>
        </span>
      )}
    </div>
  );
};
