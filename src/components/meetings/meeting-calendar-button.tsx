import { type Meeting } from '@/lib/api/meetings';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarSyncGrid } from './calendar-sync-grid';

interface MeetingCalendarButtonProps {
  meeting: Meeting;
  className?: string;
  variant?: 'dropdown' | 'modal';
}

export function MeetingCalendarButton({ meeting, className, variant = 'dropdown' }: MeetingCalendarButtonProps) {
  if (!meeting || !meeting.date_time) return null;

  if (variant === 'modal') {
    return <CalendarSyncGrid meeting={meeting} />;
  }

  return (
    <div 
      className={className} 
      onClick={(e) => {
        // Prevent the click from bubbling up to the Meeting Card and triggering a dialog open
        e.stopPropagation();
      }}
    >
      <Popover>
        <PopoverTrigger asChild>
          <button 
            type="button"
            className="flex items-center justify-center size-8 rounded-lg bg-gray-50 text-gray-400 hover:bg-primary/10 hover:text-primary transition-colors border-none shadow-none p-0 cursor-pointer"
            title="Add to Calendar"
          >
            <Calendar size={16} />
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[300px] p-3 shadow-2xl rounded-2xl border-gray-100" 
          align="end" 
          side="top"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="space-y-3">
            <div className="flex flex-col gap-0.5 px-1">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest leading-none">Sync Session</span>
              <span className="text-xs font-bold text-gray-900 truncate">{meeting.title}</span>
            </div>
            <CalendarSyncGrid meeting={meeting} />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
