import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MeetingCalendarButton } from '../meeting-calendar-button';
import { type Meeting } from '@/lib/api/meetings';

// Mock dependencies
vi.mock('../calendar-sync-grid', () => ({
  CalendarSyncGrid: () => <div data-testid="calendar-sync-grid">Calendar Sync Grid</div>,
}));

// Mock Radix Popover to just render content for simplicity in unit tests
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div data-testid="popover-content">{children}</div>,
}));

describe('MeetingCalendarButton', () => {
  const mockMeeting: Meeting = {
    id: 'meeting-1',
    title: 'Test Meeting',
    date_time: '2026-03-20T10:00:00Z',
    duration_minutes: 60,
    pair_id: 'pair-1',
    program_id: 'program-1',
    location: 'Test Location',
    notes: 'Test Notes',
    status: 'upcoming',
    created_at: '2026-03-19T10:00:00Z',
    updated_at: '2026-03-19T10:00:00Z',
    location_type: 'video'
  };

  it('renders the calendar button when meeting date is present', () => {
    render(<MeetingCalendarButton meeting={mockMeeting} />);
    expect(screen.getByTitle('Add to Calendar')).toBeDefined();
  });

  it('does not render when meeting date is missing', () => {
    const meetingWithoutDate = { ...mockMeeting, date_time: '' } as any;
    const { container } = render(<MeetingCalendarButton meeting={meetingWithoutDate} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the sync grid in dropdown variant (default)', () => {
    render(<MeetingCalendarButton meeting={mockMeeting} />);
    expect(screen.getByTestId('popover-content')).toBeDefined();
    expect(screen.getByTestId('calendar-sync-grid')).toBeDefined();
  });

  it('renders the sync grid directly in modal variant', () => {
    render(<MeetingCalendarButton meeting={mockMeeting} variant="modal" />);
    expect(screen.queryByTestId('popover-content')).toBeNull();
    expect(screen.getByTestId('calendar-sync-grid')).toBeDefined();
  });
});
