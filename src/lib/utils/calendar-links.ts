import { format, addMinutes } from 'date-fns';

export interface CalendarEvent {
  title: string;
  description: string;
  location: string;
  startTime: string; // ISO string
  durationMinutes: number;
}

/**
 * Generates a Google Calendar deep link
 */
export function getGoogleCalendarLink(event: CalendarEvent): string {
  const start = new Date(event.startTime);
  const end = addMinutes(start, event.durationMinutes);
  
  const fmt = (date: Date) => format(date, "yyyyMMdd'T'HHmmss'Z'");
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: event.description,
    location: event.location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generates an Outlook.com / Microsoft 365 deep link
 */
export function getOutlookCalendarLink(event: CalendarEvent): string {
  const start = new Date(event.startTime);
  const end = addMinutes(start, event.durationMinutes);
  
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body: event.description,
    location: event.location,
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generates a Yahoo Calendar deep link
 */
export function getYahooCalendarLink(event: CalendarEvent): string {
  const start = new Date(event.startTime);
  
  // Yahoo expects UTC format without separators: YYYYMMDDTHHmmssZ
  const fmt = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  // Calculate duration in format HHmm
  const hours = Math.floor(event.durationMinutes / 60);
  const mins = event.durationMinutes % 60;
  const dur = `${hours.toString().padStart(2, '0')}${mins.toString().padStart(2, '0')}`;
  
  const params = new URLSearchParams({
    v: '60',
    view: 'd',
    type: '20',
    title: event.title,
    st: fmt(start),
    dur: dur,
    desc: event.description,
    in_loc: event.location,
  });

  return `https://calendar.yahoo.com/?${params.toString()}`;
}

/**
 * Generates an ICS file content and triggers a download
 */
export function downloadIcsFile(event: CalendarEvent): void {
  const start = new Date(event.startTime);
  const end = addMinutes(start, event.durationMinutes);
  
  // ICS format: YYYYMMDDTHHmmssZ
  const fmt = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'PROID:-//Mentoring Passport//Calendar Sync//EN',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@mentoringpassport.com`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
    `LOCATION:${event.location}`,
    'SEQUENCE:0',
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'END:VEVENT',
    'END:VCALENDAR'
  ];

  const content = icsLines.join('\r\n');
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  
  // For better compatibility, especially in portaled components/popovers
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`);
  
  // Ensure the link is hidden but in the DOM for the click to work in all browsers
  link.style.display = 'none';
  document.body.appendChild(link);
  
  // Force click
  link.click();
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, 100);
}
