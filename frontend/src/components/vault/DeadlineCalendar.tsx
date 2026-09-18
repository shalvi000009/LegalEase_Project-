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
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-2xl backdrop-blur-xl">
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

      {/* Dark Mode Calendar CSS Overrides */}
      <style>{`
        .rbc-calendar {
          background-color: transparent;
          color: #e2e8f0;
          font-family: inherit;
        }
        .rbc-header {
          padding: 12px;
          font-weight: 600;
          font-size: 12px;
          color: #94a3b8;
          border-bottom: 1px solid #1e293b !important;
          background-color: rgba(15, 23, 42, 0.6);
        }
        .rbc-month-view, .rbc-time-view, .rbc-agenda-view {
          border: 1px solid #1e293b !important;
          background-color: rgba(15, 23, 42, 0.4);
        }
        .rbc-day-bg + .rbc-day-bg, .rbc-month-row + .rbc-month-row {
          border-color: #1e293b !important;
        }
        .rbc-off-range-bg {
          background-color: rgba(2, 6, 23, 0.6) !important;
        }
        .rbc-today {
          background-color: rgba(99, 102, 241, 0.1) !important;
        }
        .rbc-event {
          background-color: transparent !important;
          border: none !important;
          padding: 0 !important;
        }
        .rbc-agenda-view table.rbc-agenda-table {
          border-color: #1e293b !important;
        }
        .rbc-agenda-view table.rbc-agenda-table tbody > tr > td {
          border-color: #1e293b !important;
          color: #cbd5e1;
        }
        .rbc-agenda-view table.rbc-agenda-table thead > tr > th {
          border-color: #1e293b !important;
          color: #94a3b8;
        }
        .rbc-show-more {
          background-color: transparent;
          color: #818cf8;
          font-size: 11px;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};
