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
    <div className="p-4 rounded-t-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b-0">
      {/* Month / Navigation */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => onNavigate('PREV')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigate('TODAY')}
            className="px-3 py-1 rounded-lg text-xs font-semibold text-indigo-400 hover:bg-indigo-500/10 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => onNavigate('NEXT')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-indigo-400" />
          {label}
        </h3>
      </div>

      {/* View Switcher & Export */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
          <button
            onClick={() => onView('month')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              view === 'month'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => onView('week')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              view === 'week'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => onView('agenda')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              view === 'agenda'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Agenda
          </button>
        </div>

        <button
          onClick={onExportCalendar}
          className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-950/20"
        >
          <Download className="w-3.5 h-3.5" />
          Export to Calendar (.ics)
        </button>
      </div>
    </div>
  );
};
