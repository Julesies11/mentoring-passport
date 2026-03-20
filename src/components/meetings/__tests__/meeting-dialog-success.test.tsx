import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MeetingDialog } from '../meeting-dialog';
import { AuthContext } from '@/auth/context/auth-context';
import { PairingContext } from '@/providers/pairing-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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

vi.mock('../meeting-calendar-button', () => ({
  MeetingCalendarButton: () => <div data-testid="calendar-button">Calendar Button</div>,
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
    program: { status: 'active' } 
  }],
  selectedPairingId: 'pair-1',
};

describe('MeetingDialog Success State', () => {
  it('shows success state with calendar button after successful creation', async () => {
    const mockOnSubmit = vi.fn().mockResolvedValue({
      id: 'new-meeting-1',
      title: 'New Mentoring Session',
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
              onSubmit={mockOnSubmit}
            />
          </PairingContext.Provider>
        </AuthContext.Provider>
      </QueryClientProvider>
    );

    // Wait for tasks to load and be auto-selected
    await waitFor(() => {
      expect(screen.getByTestId('task-select-trigger')).toBeDefined();
    });

    // Fill out minimum required fields
    fireEvent.change(screen.getByLabelText(/Meeting Title/i), { target: { value: 'New Mentoring Session' } });
    fireEvent.change(screen.getByLabelText(/Date & Time/i), { target: { value: '2026-03-25T10:00' } });
    
    // We need to ensure pair_task_id is set. 
    // In our component, if there's only one task, it might be auto-selected in useEffect.
    
    const submitButton = screen.getByRole('button', { name: /Schedule/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Meeting Scheduled!')).toBeDefined();
      expect(screen.getByTestId('calendar-sync-grid')).toBeDefined();
    }, { timeout: 4000 });
  });
});
