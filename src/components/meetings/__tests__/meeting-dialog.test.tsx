import { render, screen, fireEvent, waitFor } from '@/test/utils';
import { MeetingDialog } from '../meeting-dialog';
import { describe, it, expect, vi } from 'vitest';

// Mock Radix Select because it's difficult to interact with in JSDOM
vi.mock('@/components/ui/select', () => ({
  Select: ({ _children, value, onValueChange }: any) => (
    <select 
      value={value} 
      onChange={(e) => onValueChange(e.target.value)}
      data-testid="mock-select"
    >
      {_children}
    </select>
  ),
  SelectTrigger: ({ _children }: any) => <>{_children}</>,
  SelectValue: ({ _placeholder }: any) => <>{_placeholder}</>,
  SelectContent: ({ _children }: any) => <>{_children}</>,
  SelectItem: ({ _children, value }: any) => <option value={value}>{value}</option>,
}));

describe('MeetingDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    pairId: 'p1',
    onSubmit: vi.fn(),
  };

  it('renders "Schedule New Meeting" title for a new meeting', async () => {
    render(<MeetingDialog {...defaultProps} />);
    
    expect(screen.getByText('Schedule New Meeting')).toBeInTheDocument();
  });

  it('renders "Edit Meeting" title when a meeting is provided', async () => {
    const mockMeeting = {
      id: 'm1',
      pair_id: 'p1',
      title: 'Current Meeting',
      date_time: new Date().toISOString(),
      notes: 'Some notes',
      status: 'upcoming' as const,
      location: '',
      meeting_type: 'virtual' as const
    };
    
    render(<MeetingDialog {...defaultProps} meeting={mockMeeting} />);
    
    expect(screen.getByText('Edit Meeting')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Current Meeting')).toBeInTheDocument();
  });

  it('calls onSubmit with correct data when form is submitted', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<MeetingDialog {...defaultProps} onSubmit={onSubmit} />);
    
    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByLabelText(/Meeting Title/)).toBeInTheDocument();
    });

    // 1. Select task first (this triggers title change in the component's useEffect)
    const selects = screen.getAllByTestId('mock-select');
    fireEvent.change(selects[0], { target: { value: 'pt1' } });

    // 2. NOW override the title
    const titleInput = screen.getByLabelText(/Meeting Title/);
    fireEvent.change(titleInput, { target: { value: 'Strategy Session' } });
    
    // 3. Fill in date
    const dateInput = screen.getByLabelText(/Date & Time/);
    fireEvent.change(dateInput, { target: { value: '2026-03-15T14:30' } });

    // Manually trigger onSubmit on the form
    const form = screen.getByRole('dialog').querySelector('form');
    if (form) {
      fireEvent.submit(form);
    }
    
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Strategy Session',
        pair_id: 'p1',
        pair_task_id: 'pt1'
      }));
    }, { timeout: 3000 });
  });
});
