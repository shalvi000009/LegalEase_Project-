import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { cn } from '../../utils/cn';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'relative p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500',
        className
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <motion.div
        initial={false}
        animate={{
          scale: isDark ? 0 : 1,
          rotate: isDark ? 90 : 0,
        }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={cn('absolute inset-0 flex items-center justify-center', isDark && 'pointer-events-none')}
      >
        <Sun className="w-5 h-5 text-amber-500" />
      </motion.div>

      <motion.div
        initial={false}
        animate={{
          scale: isDark ? 1 : 0,
          rotate: isDark ? 0 : -90,
        }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={cn('flex items-center justify-center', !isDark && 'pointer-events-none')}
      >
        <Moon className="w-5 h-5 text-indigo-400" />
      </motion.div>
    </button>
  );
};
