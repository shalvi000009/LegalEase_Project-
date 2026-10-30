import React, { useState } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import { ContractSummary } from '../../types/dates';
import { CalendarEvent, CalendarEventData } from './CalendarEvent';
import { CalendarToolbar } from './CalendarToolbar';
import { exportCalendar } from '../../api/reminders';
import toast from 'react-hot-toast';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface DeadlineCalendarProps {
  contracts: ContractSummary[];
}

export const DeadlineCalendar: React.FC<DeadlineCalendarProps> = ({ contracts }) => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<View>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Map contracts to calendar events
  const events: CalendarEventData[] = contracts.map((c) => {
    const expiryDateObj = new Date(c.expiryDate);
    const days = c.daysRemaining;

    let urgency: CalendarEventData['urgency'] = 'safe';
    if (days <= 7 || c.status === 'expired') {
      urgency = 'urgent';
    } else if (days <= 30 || c.status === 'expiring_soon') {
      urgency = 'approaching';
    }

    return {
      id: c.id,
      title: c.name,
      start: expiryDateObj,
      end: expiryDateObj,
      docId: c.id,
      dateType: c.status === 'expiring_soon' ? 'expiry_date' : 'notice_deadline',
      rawText: `Contract Expiry for ${c.name}`,
      urgency,
    };
  });

  const handleSelectEvent = (event: CalendarEventData) => {
    navigate(`/results?id=${event.docId}`);
  };

  const handleExport = async () => {
    try {
      const blob = await exportCalendar();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'legalease-deadlines.ics');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Calendar (.ics) downloaded successfully!');
    } catch (err) {
      toast.error('Failed to export calendar');
    }
  };

  return (
      <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm dark:shadow-2xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <BigCalendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              view={currentView}
              onView={(v) => setCurrentView(v)}
              date={currentDate}
              onNavigate={(d) => setCurrentDate(d)}
              onSelectEvent={handleSelectEvent}
              style={{ height: 650 }}
              components={{
                toolbar: (props) => (
                  <CalendarToolbar {...props} onExportCalendar={handleExport} />
                ),
                event: ({ event }) => <CalendarEvent event={event as CalendarEventData} />,
              }}
            />
          </div>
        </div>

        {/* Theme Responsive Calendar CSS */}
        <style>{`
        .rbc-calendar {
          background-color: transparent;
          color: #0f172a;
          font-family: inherit;
        }
        .dark .rbc-calendar {
          color: #e2e8f0;
        }
        .rbc-header {
          padding: 12px;
          font-weight: 700;
          font-size: 12px;
          color: #475569;
          border-bottom: 1px solid #e2e8f0 !important;
          background-color: #f8fafc;
        }
        .dark .rbc-header {
          color: #94a3b8;
          border-bottom: 1px solid #1e293b !important;
          background-color: rgba(15, 23, 42, 0.6);
        }
        .rbc-month-view, .rbc-time-view, .rbc-agenda-view {
          border: 1px solid #e2e8f0 !important;
          background-color: #ffffff;
        }
        .dark .rbc-month-view, .dark .rbc-time-view, .dark .rbc-agenda-view {
          border: 1px solid #1e293b !important;
          background-color: rgba(15, 23, 42, 0.4);
        }
        .rbc-day-bg + .rbc-day-bg, .rbc-month-row + .rbc-month-row {
          border-color: #e2e8f0 !important;
        }
        .dark .rbc-day-bg + .dark .rbc-day-bg, .dark .rbc-month-row + .dark .rbc-month-row {
          border-color: #1e293b !important;
        }
        .rbc-off-range-bg {
          background-color: #f8fafc !important;
        }
        .dark .rbc-off-range-bg {
          background-color: rgba(2, 6, 23, 0.6) !important;
        }
        .rbc-today {
          background-color: rgba(99, 102, 241, 0.08) !important;
        }
        .dark .rbc-today {
          background-color: rgba(99, 102, 241, 0.15) !important;
        }
        .rbc-event {
          background-color: transparent !important;
          border: none !important;
          padding: 0 !important;
        }
        .rbc-agenda-view table.rbc-agenda-table {
          border-color: #e2e8f0 !important;
        }
        .dark .rbc-agenda-view table.rbc-agenda-table {
          border-color: #1e293b !important;
        }
        .rbc-agenda-view table.rbc-agenda-table tbody > tr > td {
          border-color: #e2e8f0 !important;
          color: #334155;
          font-weight: 500;
        }
        .dark .rbc-agenda-view table.rbc-agenda-table tbody > tr > td {
          border-color: #1e293b !important;
          color: #cbd5e1;
        }
        .rbc-agenda-view table.rbc-agenda-table thead > tr > th {
          border-color: #e2e8f0 !important;
          color: #475569;
          font-weight: 700;
        }
        .dark .rbc-agenda-view table.rbc-agenda-table thead > tr > th {
          border-color: #1e293b !important;
          color: #94a3b8;
        }
        .rbc-show-more {
          background-color: transparent;
          color: #4f46e5;
          font-size: 11px;
          font-weight: 700;
        }
        .dark .rbc-show-more {
          color: #818cf8;
        }
      `}</style>
      </div>
      );
};
