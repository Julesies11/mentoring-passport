import { 
  getGoogleCalendarLink, 
  getOutlookCalendarLink, 
  getYahooCalendarLink, 
  downloadIcsFile,
  type CalendarEvent 
} from '@/lib/utils/calendar-links';
import { Button } from '@/components/ui/button';
import { toAbsoluteUrl } from '@/lib/helpers';
import { type Meeting } from '@/lib/api/meetings';

interface CalendarSyncGridProps {
  meeting: Meeting;
}

export function CalendarSyncGrid({ meeting }: CalendarSyncGridProps) {
  const event: CalendarEvent = {
    title: meeting.title || 'Mentoring Meeting',
    description: meeting.notes || `Mentoring session for task: ${meeting.task?.name || 'Progress Sync'}`,
    location: meeting.location || 'Online / Mentoring Session',
    startTime: meeting.date_time,
    durationMinutes: meeting.duration_minutes || 60,
  };

  const providers = [
    {
      name: 'Google',
      logo: 'google-calendar.svg',
      href: getGoogleCalendarLink(event),
    },
    {
      name: 'Outlook',
      logo: 'microsoft-5.svg',
      href: getOutlookCalendarLink(event),
    },
    {
      name: 'Apple / iCal',
      logo: 'apple-black.svg',
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        downloadIcsFile(event);
      },
    },
    {
      name: 'Yahoo',
      logo: 'google-calendar.svg', // Visual fallback for yahoo
      href: getYahooCalendarLink(event),
    },
  ];

  const itemClassName = "flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-primary/30 transition-all text-left group";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full" onClick={(e) => e.stopPropagation()} data-testid="calendar-sync-grid">
      {providers.map((provider) => {
        const content = (
          <>
            <div className="size-8 shrink-0 flex items-center justify-center bg-gray-50 rounded-lg group-hover:bg-white transition-colors">
              <img
                src={toAbsoluteUrl(`/media/brand-logos/${provider.logo}`)}
                className="size-5 shrink-0"
                alt={provider.name}
                loading="eager"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-gray-900 leading-tight mb-0.5">
                {provider.name}
              </span>
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-tight">
                Sync Session
              </span>
            </div>
          </>
        );

        if (provider.href) {
          return (
            <a
              key={provider.name}
              href={provider.href}
              target="_blank"
              rel="noopener noreferrer"
              className={itemClassName}
              onClick={(e) => e.stopPropagation()}
            >
              {content}
            </a>
          );
        }

        return (
          <button
            key={provider.name}
            type="button"
            onClick={provider.onClick}
            className={itemClassName}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
