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
        return 'bg-rose-500/20 text-rose-200 border-rose-500/40 hover:bg-rose-500/30';
      case 'approaching':
        return 'bg-amber-500/20 text-amber-200 border-amber-500/40 hover:bg-amber-500/30';
      case 'safe':
      default:
        return 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40 hover:bg-emerald-500/30';
    }
  };

  return (
    <div
      className={`h-full w-full p-1 rounded border text-xs overflow-hidden flex flex-col justify-between transition-colors shadow-sm ${getUrgencyClass(
        event.urgency
      )}`}
      title={`${event.title} (${event.dateType.replace(/_/g, ' ')})\n${event.rawText || ''}`}
    >
      <div className="font-semibold truncate text-[11px] leading-tight">
        {event.title}
      </div>
      <div className="mt-0.5">
        <DateTypeBadge type={event.dateType} showIcon={false} className="py-0 px-1 text-[9px]" />
      </div>
    </div>
  );
};
