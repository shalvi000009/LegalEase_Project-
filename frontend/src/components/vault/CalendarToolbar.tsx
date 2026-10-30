import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Download } from 'lucide-react';
import { ToolbarProps } from 'react-big-calendar';

interface CustomToolbarProps extends ToolbarProps<any> {
  onExportCalendar: () => void;
}

export const CalendarToolbar: React.FC<CustomToolbarProps> = ({
  label,
  onNavigate,
  onView,
  view,
  onExportCalendar,
}) => {
  return (
      <div className="p-4 rounded-t-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b-0 shadow-sm">
        {/* Month / Navigation */}
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <button
                onClick={() => onNavigate('PREV')}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Previous"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigate('TODAY')}
                className="px-3 py-1 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => onNavigate('NEXT')}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Next"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                <CalendarIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                {label}
              </h3>
          </div>

          {/* View Switcher & Export */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-1">
                  <button
                    onClick={() => onView('month')}
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
          >
            Month
          </button>
          <button
            onClick={() => onView('week')}
            className = {`px-3 py-1 rounded-lg text-xs font-bold transition-all ${view === 'week'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => onView('agenda')}
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
          >
            Agenda
          </button>
        </div>

        <button
          onClick={onExportCalendar}
          className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-600/20 dark:hover:bg-emerald-600/30 dark:text-emerald-400 dark:border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          Export to Calendar (.ics)
        </button>
      </div>
    </div>
  );
};
