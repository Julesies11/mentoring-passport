import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MeetingDialog } from '../meeting-dialog';
import { AuthContext } from '@/auth/context/auth-context';
import { PairingContext } from '@/providers/pairing-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock dependencies
vi.mock('@/lib/api/meetings', () => ({
  createMeeting: vi.fn(),
  updateMeeting: vi.fn(),
}));

vi.mock('@/lib/api/tasks', () => ({
  fetchPairTasks: vi.fn().mockResolvedValue([
    { id: 'task-1', name: 'Test Task', status: 'not_submitted' }
  ]),
}));

vi.mock('@/lib/api/pairs', () => ({
  fetchPairs: vi.fn().mockResolvedValue([]),
  fetchPair: vi.fn().mockResolvedValue({ id: 'pair-1' }),
}));

vi.mock('../calendar-sync-grid', () => ({
  CalendarSyncGrid: () => <div data-testid="calendar-sync-grid">Calendar Sync Grid</div>,
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const mockAuth = {
  user: { id: 'user-1', full_name: 'Test User' },
  role: 'program-member',
  isSupervisor: false,
};

const mockPairing = {
  pairings: [{ 
    id: 'pair-1', 
    mentor_id: 'user-1', 
    mentee: { full_name: 'Mentee Name' },
    program: { status: 'active', name: 'Test Program' } 
  }],
  selectedPairingId: 'pair-1',
};

describe('Universal Meeting Hub (MeetingDialog)', () => {
  const mockMeeting = {
    id: 'meeting-1',
    title: 'Existing Sync',
    date_time: '2026-03-25T10:00:00Z',
    duration_minutes: 60,
    pair_id: 'pair-1',
    location: 'Virtual Office',
    notes: 'Discussion points',
    location_type: 'video',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Management Hub by default for an existing meeting', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={mockAuth as any}>
          <PairingContext.Provider value={mockPairing as any}>
            <MeetingDialog
              open={true}
              onOpenChange={() => {}}
              pairId="pair-1"
              meeting={mockMeeting as any}
              onSubmit={async () => {}}
            />
          </PairingContext.Provider>
        </AuthContext.Provider>
      </QueryClientProvider>
    );

    // Verify Read-only details are visible
    expect(screen.getByText('Existing Sync')).toBeDefined();
    expect(screen.getByText(/Virtual Office/i)).toBeDefined();
    expect(screen.getByText(/"Discussion points"/i)).toBeDefined();
    
    // Verify Sync Grid is visible
    expect(screen.getByTestId('calendar-sync-grid')).toBeDefined();
    
    // Verify Hub actions
    expect(screen.getByRole('button', { name: /Update/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Done/i })).toBeDefined();
  });

  it('switches to Edit Mode when "Update" is clicked in the Hub', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={mockAuth as any}>
          <PairingContext.Provider value={mockPairing as any}>
            <MeetingDialog
              open={true}
              onOpenChange={() => {}}
              pairId="pair-1"
              meeting={mockMeeting as any}
              onSubmit={async () => {}}
            />
          </PairingContext.Provider>
        </AuthContext.Provider>
      </QueryClientProvider>
    );

    const updateBtn = screen.getByRole('button', { name: /Update/i });
    fireEvent.click(updateBtn);

    // Now it should show the form
    await waitFor(() => {
      expect(screen.getByLabelText(/Meeting Title/i)).toBeDefined();
      expect(screen.getByDisplayValue('Existing Sync')).toBeDefined();
    });
  });

  it('pre-fills the date correctly when initialDate is provided for a new meeting', async () => {
    const customDate = '2026-04-10T14:30';
    render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={mockAuth as any}>
          <PairingContext.Provider value={mockPairing as any}>
            <MeetingDialog
              open={true}
              onOpenChange={() => {}}
              pairId="pair-1"
              initialDate={customDate}
              onSubmit={async () => {}}
            />
          </PairingContext.Provider>
        </AuthContext.Provider>
      </QueryClientProvider>
    );

    // Verify the Date button shows the formatted date
    await waitFor(() => {
      expect(screen.getByText(/April 10th/i)).toBeDefined();
    });
  });

  it('shows the Success View with sync grid after scheduling a new meeting', async () => {
    const mockOnSubmit = vi.fn().mockResolvedValue({
      id: 'new-123',
      title: 'New Session',
      date_time: '2026-03-25T10:00:00Z',
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={mockAuth as any}>
          <PairingContext.Provider value={mockPairing as any}>
            <MeetingDialog
              open={true}
              onOpenChange={() => {}}
              pairId="pair-1"
              initialDate="2026-03-25T10:00:00Z" // Pre-fill to bypass custom picker interaction
              onSubmit={mockOnSubmit}
            />
          </PairingContext.Provider>
        </AuthContext.Provider>
      </QueryClientProvider>
    );

    // Fill form
    fireEvent.change(screen.getByLabelText(/Meeting Title/i), { target: { value: 'New Session' } });
    
    // Submit (we use form submit directly to bypass validation issues in JSDOM with hidden fields)
    const form = screen.getByRole('dialog').querySelector('form');
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(screen.getByText('Meeting Scheduled!')).toBeDefined();
      expect(screen.getByTestId('calendar-sync-grid')).toBeDefined();
    });
  });
});
