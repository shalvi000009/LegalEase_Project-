import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="h-14 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2 shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">
          LE
        </div>
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          LegalEase &copy; {new Date().getFullYear()}
        </span>
        <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
        <span className="hidden sm:inline text-[11px] text-slate-400">
          AI Contract Analysis & Compliance Platform
        </span>
      </div>

      <div className="flex items-center gap-4 text-[11px]">
        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Services Operational</span>
        </div>
        <span className="text-slate-300 dark:text-slate-700">•</span>
        <a
          href="/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium"
        >
          API Spec
        </a>
      </div>
    </footer>
  );
};
