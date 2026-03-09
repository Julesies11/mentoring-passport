import { render, screen, fireEvent, waitFor } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { TaskDialog } from '../task-dialog';
import { describe, it, expect, vi } from 'vitest';

const mockTask = {
  id: 'pt1',
  name: 'Initial Meeting',
  status: 'not_submitted' as const,
  evidence_notes: 'Initial progress note',
  evidence_type: {
    id: 'et1',
    name: 'Photo evidence',
    requires_submission: true
  }
};

describe('TaskDialog', () => {
  // Use a longer timeout for userEvent and animations
  vi.setConfig({ testTimeout: 15000 });

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

  it('initializes notes field with task.evidence_notes', async () => {
    const user = userEvent.setup();
    render(<TaskDialog {...defaultProps} />);
    
    // 1. Click "Get Started" to go to Step 2 (Reflection)
    const startBtn = screen.getByText(/Get Started/i);
    await user.click(startBtn);

    // 2. Find notes area
    const notesArea = screen.getByPlaceholderText(/What progress have you made/);
    expect(notesArea).toHaveValue('Initial progress note');
  });

  it('calls onSubmitEvidence when "Submit for Review" is clicked', async () => {
    const user = userEvent.setup();
    const onSubmitEvidence = vi.fn().mockResolvedValue(undefined);
    render(<TaskDialog {...defaultProps} onSubmitEvidence={onSubmitEvidence} />);
    
    // 1. Go to Reflection (Step 2)
    await user.click(screen.getByText(/Get Started/i));
    
    // 2. Update notes
    const notesArea = screen.getByPlaceholderText(/What progress have you made/);
    await user.clear(notesArea);
    await user.type(notesArea, 'Updated progress note');
    
    // 3. Go to Evidence (Step 3)
    await user.click(screen.getByText(/Next: Evidence/i));

    // 4. Upload a mock file (Required because requires_submission: true)
    const file = new File(['hello'], 'test.png', { type: 'image/png' });
    const input = document.getElementById('file-upload') as HTMLInputElement;
    await user.upload(input, file);
    
    // 5. Click submit
    const submitButton = screen.getByText('Submit for Review');
    // Ensure button is enabled
    await waitFor(() => expect(submitButton).not.toBeDisabled());
    await user.click(submitButton);
    
    // Wait for the mock to be called
    await waitFor(() => {
      expect(onSubmitEvidence).toHaveBeenCalled();
    }, { timeout: 5000 });

    expect(onSubmitEvidence).toHaveBeenCalledWith(
      'pt1', 
      expect.objectContaining({ 
        description: 'Updated progress note',
        files: expect.arrayContaining([expect.any(File)])
      }),
      true
    );
  });

  it('renders "Complete Task" instead of "Submit for Review" when no submission is required', async () => {
    const user = userEvent.setup();
    const noSubmissionTask = {
      ...mockTask,
      evidence_type: {
        id: 'et2',
        name: 'Discussion',
        requires_submission: false
      }
    };
    
    render(<TaskDialog {...defaultProps} task={noSubmissionTask} />);
    
    // Go to Step 3
    await user.click(screen.getByText(/Get Started/i));
    await user.click(screen.getByText(/Next: Evidence/i));
    
    const completeBtn = screen.getByText('Complete Task');
    await waitFor(() => expect(completeBtn).not.toBeDisabled());
    
    expect(completeBtn).toBeInTheDocument();
    expect(screen.queryByText('Submit for Review')).not.toBeInTheDocument();
  });

  it('calls onSubmitEvidence with submitForReview=false when "Save Draft" is clicked', async () => {
    const user = userEvent.setup();
    const onSubmitEvidence = vi.fn().mockResolvedValue(undefined);
    render(<TaskDialog {...defaultProps} onSubmitEvidence={onSubmitEvidence} />);
    
    // 1. Go to Reflection (Step 2)
    await user.click(screen.getByText(/Get Started/i));
    
    // 2. Update notes
    const notesArea = screen.getByPlaceholderText(/What progress have you made/);
    await user.type(notesArea, '...more');
    
    // 3. Click Save Draft (available in footer)
    const saveButton = screen.getByText('Save Draft');
    await waitFor(() => expect(saveButton).not.toBeDisabled());
    await user.click(saveButton);
    
    await waitFor(() => {
      expect(onSubmitEvidence).toHaveBeenCalled();
    });

    expect(onSubmitEvidence).toHaveBeenCalledWith(
      'pt1', 
      expect.objectContaining({ description: 'Initial progress note...more' }),
      false
    );
  });

  it('renders feedback from supervisor when in revision_required status', async () => {
    const user = userEvent.setup();
    const revisionTask = {
      ...mockTask,
      status: 'revision_required' as const,
      rejection_reason: 'Please upload a clearer photo'
    };
    
    render(<TaskDialog {...defaultProps} task={revisionTask} />);
    
    // Dialog starts on Step 2 for revision_required
    // Click Back to Overview (Step 1)
    const backBtn = screen.getByText(/Back to Overview/i);
    await user.click(backBtn);
    
    // Use getAllByText as there might be a badge and a section header
    const feedbackLabels = screen.getAllByText(/Revision Requested/i);
    expect(feedbackLabels.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Please upload a clearer photo/i)).toBeInTheDocument();
  });

  it('renders "Task Successfully Validated" state when completed', () => {
    const completedTask = {
      ...mockTask,
      status: 'completed' as const,
      completed_at: new Date().toISOString()
    };
    
    render(<TaskDialog {...defaultProps} task={completedTask} />);
    
    expect(screen.getByText('Task Successfully Validated')).toBeInTheDocument();
    expect(screen.queryByText('Submit for Review')).not.toBeInTheDocument();
    expect(screen.queryByText('Complete Task')).not.toBeInTheDocument();
  });
});
