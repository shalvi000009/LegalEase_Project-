import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="h-12 border-t border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm px-6 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
      <span>LegalEase Platform v1.0.0</span>
      <span>Built with React + TypeScript + Tailwind</span>
    </footer>
  );
};
