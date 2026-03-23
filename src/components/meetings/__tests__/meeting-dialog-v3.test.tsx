import { ROLES, PAIR_STATUS, PROGRAM_STATUS, TASK_STATUS, MEETING_STATUS } from '@/config/constants';
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MeetingDialog } from '../meeting-dialog';
import * as tasksApi from '@/lib/api/tasks';
import * as pairingProvider from '@/providers/pairing-provider';

// Mock API
vi.mock('@/lib/api/tasks', () => ({
  fetchPairTasks: vi.fn(),
}));

vi.mock('@/lib/api/meetings', () => ({
  createMeeting: vi.fn().mockResolvedValue({}),
  updateMeeting: vi.fn().mockResolvedValue({}),
  getMeetingStatus: vi.fn().mockReturnValue(MEETING_STATUS.UPCOMING),
}));

vi.mock('../calendar-sync-grid', () => ({
  CalendarSyncGrid: () => <div data-testid="calendar-sync-grid">Calendar Sync Grid</div>,
}));

// Mock usePairing hook
vi.mock('@/providers/pairing-provider', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    usePairing: vi.fn(),
  };
});

const mockUser = { id: 'u1', full_name: 'Test User', role: ROLES.PROGRAM_MEMBER };
const mockSupervisor = { id: 's1', full_name: 'Test Supervisor', role: ROLES.SUPERVISOR };

const mockPairings = [
  { 
    id: 'pair1', 
    mentor_id: 'u1', 
    mentee_id: 'm1', 
    status: PAIR_STATUS.ACTIVE,
    program: { status: PROGRAM_STATUS.ACTIVE, name: 'Prog 1', start_date: '2025-01-01' },
    mentee: { full_name: 'Mentee 1', avatar_url: '', job_title: 'Junior' },
    mentor: { full_name: 'Test User', avatar_url: '', job_title: 'Senior' }
  },
  { 
    id: 'pair2', 
    mentor_id: 'u1', 
    mentee_id: 'm2', 
    status: PAIR_STATUS.ACTIVE,
    program: { status: PROGRAM_STATUS.ACTIVE, name: 'Prog 2', start_date: '2025-02-01' },
    mentee: { full_name: 'Mentee 2', avatar_url: '', job_title: 'Med' },
    mentor: { full_name: 'Test User', avatar_url: '', job_title: 'Senior' }
  }
];

describe('MeetingDialog V3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tasksApi.fetchPairTasks).mockResolvedValue([
      { id: 'task1', name: 'Task 1', status: TASK_STATUS.NOT_SUBMITTED },
      { id: 'task2', name: 'Task 2', status: TASK_STATUS.COMPLETED },
    ] as any);
    
    vi.mocked(pairingProvider.usePairing).mockReturnValue({
      pairings: mockPairings,
      selectedPairingId: 'pair1',
      setSelectedPairingId: vi.fn(),
      isLoading: false,
      selectedPairing: mockPairings[0]
    });
  });

  it('allows program member to select from multiple pairs', async () => {
    render(
      <MeetingDialog 
        open={true} 
        onOpenChange={vi.fn()} 
        pairId="" 
        onSubmit={vi.fn() as any} 
      />,
      { authValue: { user: mockUser as any, isSupervisor: false } }
    );

    expect(screen.getByTestId('pair-select-trigger')).toBeInTheDocument();
  });

  it('allows supervisor to select from active pairs and shows role labels', async () => {
    render(
      <MeetingDialog 
        open={true} 
        onOpenChange={vi.fn()} 
        pairId="pair1" 
        onSubmit={vi.fn() as any} 
      />,
      { authValue: { user: mockSupervisor as any, isSupervisor: true } }
    );

    expect(screen.getByText(/MENTORING PAIR/i)).toBeInTheDocument();
  });

  it('filters out completed tasks but shows "Review" for awaiting_review tasks', async () => {
    vi.mocked(tasksApi.fetchPairTasks).mockResolvedValue([
      { id: 'task1', name: 'Active Task', status: TASK_STATUS.NOT_SUBMITTED },
      { id: 'task2', name: 'Review Task', status: TASK_STATUS.AWAITING_REVIEW },
      { id: 'task3', name: 'Done Task', status: TASK_STATUS.COMPLETED },
    ] as any);

    render(
      <MeetingDialog 
        open={true} 
        onOpenChange={vi.fn()} 
        pairId="pair1" 
        onSubmit={vi.fn() as any} 
      />,
      { authValue: { user: mockUser as any, isSupervisor: false } }
    );

    // Open task select
    const taskTrigger = screen.getByTestId('task-select-trigger');
    fireEvent.click(taskTrigger);

    // Assert using screen query (Radix renders in portal)
    await waitFor(() => {
      // Use case-insensitive regex to find the tasks regardless of "REVIEW:" prefix
      expect(screen.queryAllByText(/Active Task/i).length).toBeGreaterThan(0);
      expect(screen.queryAllByText(/Review Task/i).length).toBeGreaterThan(0);
      expect(screen.queryByText(/Done Task/i)).not.toBeInTheDocument();
    });
  });

  it('closes the dialog after successful submission', async () => {
    const onOpenChange = vi.fn();
    const onSubmit = vi.fn().mockResolvedValue({});

    render(
      <MeetingDialog 
        open={true} 
        onOpenChange={onOpenChange} 
        pairId="pair1" 
        onSubmit={onSubmit}
        initialDate="2026-03-22T10:00"
      />,
      { authValue: { user: mockUser as any, isSupervisor: false } }
    );

    // Wait for form to initialize with task title
    await waitFor(() => {
      expect(screen.getByDisplayValue('Task 1')).toBeInTheDocument();
    });

    // Provide a title to ensure form is valid
    const titleInput = screen.getByPlaceholderText(/e.g., Monthly Progress Sync/i);
    fireEvent.change(titleInput, { target: { value: 'New Mentoring Session' } });

    const submitBtn = screen.getByRole('button', { name: /Schedule/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
      expect(screen.getByText('Meeting Scheduled!')).toBeInTheDocument();
    });

    const doneBtn = screen.getByRole('button', { name: /Done/i });
    fireEvent.click(doneBtn);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
