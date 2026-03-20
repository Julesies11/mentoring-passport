import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CalendarSyncGrid } from '../calendar-sync-grid';
import { type Meeting } from '@/lib/api/meetings';
import * as calendarLinks from '@/lib/utils/calendar-links';

// Mock the calendar links utility
vi.mock('@/lib/utils/calendar-links', async () => {
  const actual = await vi.importActual<typeof calendarLinks>('@/lib/utils/calendar-links');
  return {
    ...actual,
    downloadIcsFile: vi.fn(),
  };
});

describe('CalendarSyncGrid', () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all 4 calendar providers', () => {
    render(<CalendarSyncGrid meeting={mockMeeting} />);
    expect(screen.getByText('Google')).toBeDefined();
    expect(screen.getByText('Outlook')).toBeDefined();
    expect(screen.getByText('Apple / iCal')).toBeDefined();
    expect(screen.getByText('Yahoo')).toBeDefined();
  });

  it('generates correct Google link', () => {
    render(<CalendarSyncGrid meeting={mockMeeting} />);
    const link = screen.getByRole('link', { name: /Google/i });
    expect(link.getAttribute('href')).toContain('calendar.google.com');
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('calls downloadIcsFile when Apple / iCal is clicked', () => {
    render(<CalendarSyncGrid meeting={mockMeeting} />);
    const button = screen.getByRole('button', { name: /Apple \/ iCal/i });
    fireEvent.click(button);
    expect(calendarLinks.downloadIcsFile).toHaveBeenCalled();
  });

  it('prevents click propagation on links', () => {
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <CalendarSyncGrid meeting={mockMeeting} />
      </div>
    );
    
    const link = screen.getByRole('link', { name: /Google/i });
    fireEvent.click(link);
    
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('prevents click propagation on buttons', () => {
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <CalendarSyncGrid meeting={mockMeeting} />
      </div>
    );
    
    const button = screen.getByRole('button', { name: /Apple \/ iCal/i });
    fireEvent.click(button);
    
    expect(parentClick).not.toHaveBeenCalled();
  });
});
