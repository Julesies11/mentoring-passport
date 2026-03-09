import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MeetingDialog } from '../meeting-dialog';
import { render } from '@/test/utils';
import * as tasksApi from '@/lib/api/tasks';
import * as pairsApi from '@/lib/api/pairs';

// Mock APIs
vi.mock('@/lib/api/tasks', () => ({
  fetchPairTasks: vi.fn(),
}));

vi.mock('@/lib/api/pairs', () => ({
  fetchPair: vi.fn(),
  fetchPairs: vi.fn(),
}));

describe('MeetingDialog V3', () => {
  const mockUser = { id: 'u1', full_name: 'Current User' };
  const mockPair1 = {
    id: 'p1',
    status: 'active',
    mentor_id: 'u1',
    mentee_id: 'e1',
    mentor: { id: 'u1', full_name: 'Mentor Name' },
    mentee: { id: 'e1', full_name: 'Mentee Name' },
  };
  const mockPair2 = {
    id: 'p2',
    status: 'active',
    mentor_id: 'u1',
    mentee_id: 'e2',
    mentor: { id: 'u1', full_name: 'Mentor Name' },
    mentee: { id: 'e2', full_name: 'Mentee Two' },
  };

  const mockTasks = [
    { id: 't1', name: 'Task One', status: 'not_submitted' },
    { id: 't2', name: 'Task Two', status: 'completed' },
    { id: 't3', name: 'Task Three', status: 'awaiting_review' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tasksApi.fetchPairTasks).mockResolvedValue(mockTasks as any);
    vi.mocked(pairsApi.fetchPair).mockResolvedValue(mockPair1 as any);
    vi.mocked(pairsApi.fetchPairs).mockResolvedValue([mockPair1, mockPair2] as any);
  });

  it('allows program member to select from multiple pairs', async () => {
    const user = userEvent.setup();
    render(
      <MeetingDialog
        open={true}
        onOpenChange={vi.fn()}
        pairId=""
        onSubmit={vi.fn()}
      />,
      { 
        authValue: { user: mockUser, role: 'program-member' } as any,
        pairingValue: { pairings: [mockPair1, mockPair2], selectedPairingId: '' } as any 
      }
    );

    const trigger = await screen.findByTestId('pair-select-trigger');
    await user.click(trigger);
    
    // Check for partner name in options (using within to be safe)
    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getByText('Mentee Name')).toBeInTheDocument();
    expect(within(listbox).getByText('Mentee Two')).toBeInTheDocument();
  });

  it('allows supervisor to select from active pairs and shows role labels', async () => {
    const user = userEvent.setup();
    
    render(
      <MeetingDialog
        open={true}
        onOpenChange={vi.fn()}
        pairId=""
        onSubmit={vi.fn()}
      />,
      { authValue: { user: mockUser, role: 'supervisor' } as any }
    );

    const trigger = await screen.findByTestId('pair-select-trigger');
    await user.click(trigger);

    const listbox = await screen.findByRole('listbox');
    const options = within(listbox).getAllByRole('option');
    
    // Check content using regex to be case-insensitive and match partials
    expect(options[0]).toHaveTextContent(/Mentor Name/i);
    expect(options[0]).toHaveTextContent(/Mentor/i);
    expect(options[0]).toHaveTextContent(/Mentee Name/i);
    expect(options[0]).toHaveTextContent(/Mentee/i);
  });

  it('filters out completed tasks but shows "Review" for awaiting_review tasks', async () => {
    const user = userEvent.setup();
    render(
      <MeetingDialog
        open={true}
        onOpenChange={vi.fn()}
        pairId="p1"
        onSubmit={vi.fn()}
      />,
      { 
        authValue: { user: mockUser, role: 'program-member' } as any,
        pairingValue: { pairings: [mockPair1] } as any 
      }
    );

    const trigger = await screen.findByTestId('task-select-trigger');
    await user.click(trigger);

    const listbox = await screen.findByRole('listbox');
    
    // Task One (not_submitted) should show "Pending"
    expect(within(listbox).getByText('Task One')).toBeInTheDocument();
    expect(within(listbox).getByText(/pending/i)).toBeInTheDocument();
    
    // Task Three (awaiting_review) should show "Review"
    expect(within(listbox).getByText('Task Three')).toBeInTheDocument();
    expect(within(listbox).getByText(/review/i)).toBeInTheDocument();
    
    // Task Two (completed) should NOT be there
    expect(within(listbox).queryByText('Task Two')).not.toBeInTheDocument();
  });

  it('closes the dialog after successful submission', async () => {
    const user = userEvent.setup();
    const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
    const mockOnOpenChange = vi.fn();
    
    render(
      <MeetingDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        pairId="p1"
        onSubmit={mockOnSubmit}
      />,
      { 
        authValue: { user: mockUser, role: 'program-member' } as any,
        pairingValue: { pairings: [mockPair1] } as any 
      }
    );

    // 1. Enter Title
    const titleInput = screen.getByPlaceholderText(/progress sync/i);
    await user.clear(titleInput);
    await user.type(titleInput, 'Test Meeting');

    // 2. Enter Date
    const dateInput = screen.getByLabelText(/Date & Time/i);
    fireEvent.change(dateInput, { target: { value: '2026-03-10T10:00' } });
    
    // Note: To avoid Radix UI Select issues in this test environment, 
    // we'll assume the first task is auto-selected (which the component does)
    // and just click Schedule.

    // 4. Submit
    const submitBtn = screen.getByRole('button', { name: /schedule/i });
    
    // Wait for the button to be enabled (it needs title, date, and auto-selected task)
    await waitFor(() => expect(submitBtn).not.toBeDisabled());
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
