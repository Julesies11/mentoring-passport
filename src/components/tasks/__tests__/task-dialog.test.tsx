import { render, screen, fireEvent } from '@/test/utils';
import { TaskDialog } from '../task-dialog';
import { describe, it, expect, vi } from 'vitest';

const mockTask = {
  id: 'pt1',
  name: 'Initial Meeting',
  status: 'not_submitted' as const,
  evidence_type: {
    id: 'et1',
    name: 'Photo evidence',
    requires_submission: true
  }
};

describe('TaskDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    task: mockTask,
    pairId: 'p1',
    onSubmitEvidence: vi.fn(),
    onUpdateStatus: vi.fn(),
  };

  it('renders task name and evidence requirement badge', () => {
    render(<TaskDialog {...defaultProps} />);
    
    expect(screen.getByText('Initial Meeting')).toBeInTheDocument();
    expect(screen.getByText('Evidence Required')).toBeInTheDocument();
  });

  it('calls onSubmitEvidence when "Submit for Review" is clicked', async () => {
    const onSubmitEvidence = vi.fn().mockResolvedValue(undefined);
    render(<TaskDialog {...defaultProps} onSubmitEvidence={onSubmitEvidence} />);
    
    // Enter notes
    const notesArea = screen.getByPlaceholderText(/What progress have you made/);
    fireEvent.change(notesArea, { target: { value: 'Finished the meeting' } });
    
    // Click submit
    const submitButton = screen.getByText('Submit for Review');
    fireEvent.click(submitButton);
    
    expect(onSubmitEvidence).toHaveBeenCalledWith(
      'pt1', 
      expect.objectContaining({ description: 'Finished the meeting' }),
      true
    );
  });

  it('renders feedback from supervisor when in revision_required status', () => {
    const revisionTask = {
      ...mockTask,
      status: 'revision_required' as const,
      last_feedback: 'Please upload a clearer photo'
    };
    
    render(<TaskDialog {...defaultProps} task={revisionTask} />);
    
    expect(screen.getByText(/Feedback from Supervisor/)).toBeInTheDocument();
    expect(screen.getByText(/"Please upload a clearer photo"/)).toBeInTheDocument();
  });

  it('renders "Task Validated" state when completed', () => {
    const completedTask = {
      ...mockTask,
      status: 'completed' as const,
      completed_at: new Date().toISOString()
    };
    
    render(<TaskDialog {...defaultProps} task={completedTask} />);
    
    expect(screen.getByText('Task Validated')).toBeInTheDocument();
    expect(screen.queryByText('Submit for Review')).not.toBeInTheDocument();
  });
});
