import React from 'react';
import { DateTypeBadge } from '../dates/DateTypeBadge';
import { DateType } from '../../types/dates';

export interface CalendarEventData {
  id: string;
  title: string;
  start: Date;
  end: Date;
  docId: string;
  dateType: DateType;
  rawText?: string;
  urgency: 'safe' | 'approaching' | 'urgent';
}

interface CalendarEventProps {
  event: CalendarEventData;
}

export const CalendarEvent: React.FC<CalendarEventProps> = ({ event }) => {
  const getUrgencyClass = (urgency: CalendarEventData['urgency']) => {
    switch (urgency) {
      case 'urgent':
        return 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-500/20 dark:text-rose-200 dark:border-rose-500/40 hover:bg-rose-100 dark:hover:bg-rose-500/30';
      case 'approaching':
        return 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-500/40 hover:bg-amber-100 dark:hover:bg-amber-500/30';
      case 'safe':
      default:
        return 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-200 dark:border-emerald-500/40 hover:bg-emerald-100 dark:hover:bg-emerald-500/30';
    }
  };

  return (
    <div
        className = {`h-full w-full p-1.5 rounded-lg border text-xs overflow-hidden flex flex-col justify-between transition-all duration-200 shadow-sm ${getUrgencyClass(
          event.urgency
        )}`}
      title={`${event.title} (${ event.dateType.replace(/_/g, ' ') }) \n${ event.rawText || '' } `}
    >
      <div className="font-bold truncate text-[11px] leading-tight">
        {event.title}
      </div>
      <div className="mt-1">
        <DateTypeBadge type={event.dateType} showIcon={false} className="py-0 px-1 text-[9px] font-semibold" />
      </div>
    </div>
  );
};
