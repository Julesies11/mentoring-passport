import { screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupervisorCalendarPage } from '../calendar-page';
import { render } from '@/test/utils';
import * as meetingsHook from '@/hooks/use-meetings';
import * as pairsHook from '@/hooks/use-pairs';

// Mock hooks
vi.mock('@/hooks/use-meetings', () => ({
  useAllMeetings: vi.fn(),
  getMeetingStatus: vi.fn((date) => (new Date(date) > new Date() ? 'upcoming' : 'past')),
}));

vi.mock('@/hooks/use-pairs', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useAllPairs: vi.fn(),
  };
});

// Mock useOrganisation
vi.mock('@/providers/organisation-provider', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useOrganisation: vi.fn(() => ({
      programs: [{ id: 'prog1', name: 'Test Program', status: 'active' }],
      activeProgram: { id: 'prog1', name: 'Test Program', status: 'active' },
      isLoading: false
    })),
  };
});

// Mock MeetingCalendar to avoid FullCalendar issues in tests
vi.mock('@/components/calendar/meeting-calendar', () => ({
  MeetingCalendar: () => <div data-testid="meeting-calendar">Calendar Mock</div>,
}));

describe('SupervisorCalendarPage', () => {
  const mockMeetings = [
    {
      id: 'm1',
      title: 'Upcoming Sync',
      date_time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      pair_id: 'p1',
      mp_pairs: {
        mentor: { full_name: 'Mentor Name' },
        mentee: { full_name: 'Mentee Name' },
      },
    },
  ];

  const mockPairs = [
    { 
      id: 'p1', 
      mentor: { full_name: 'Mentor One' }, 
      mentee: { full_name: 'Mentee One' },
      program: { status: 'active' },
      status: 'active'
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    vi.mocked(meetingsHook.useAllMeetings).mockReturnValue({
      meetings: [],
      isLoading: true,
      createMeeting: vi.fn(),
      updateMeeting: vi.fn(),
      deleteMeeting: vi.fn(),
    } as any);
    vi.mocked(pairsHook.useAllPairs).mockReturnValue({ data: [], isLoading: false } as any);

    render(<SupervisorCalendarPage />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders meetings and stats correctly', () => {
    vi.mocked(meetingsHook.useAllMeetings).mockReturnValue({
      meetings: mockMeetings,
      isLoading: false,
      createMeeting: vi.fn(),
      updateMeeting: vi.fn(),
      deleteMeeting: vi.fn(),
    } as any);
    vi.mocked(pairsHook.useAllPairs).mockReturnValue({ data: mockPairs, isLoading: false } as any);

    render(<SupervisorCalendarPage />);

    expect(screen.getByText(/upcoming sync/i)).toBeInTheDocument();
    // Use a more specific query for the stat counter
    const statElements = screen.queryAllByText('1');
    expect(statElements.length).toBeGreaterThan(0);
  });
});
