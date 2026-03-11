import { render, screen, waitFor } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { TaskDialog } from '../task-dialog';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock useFileUpload hook
const mockFiles: any[] = [];
const mockAddFiles = vi.fn();
const mockRemoveFile = vi.fn();
const mockClearFiles = vi.fn();
const mockGetInputProps = vi.fn(() => ({
  onChange: (e: any) => mockAddFiles(e.target.files),
  multiple: true,
  type: 'file',
}));

vi.mock('@/hooks/use-file-upload', () => ({
  useFileUpload: vi.fn(() => [
    { files: mockFiles, isDragging: false, errors: [] },
    {
      addFiles: mockAddFiles,
      removeFile: mockRemoveFile,
      clearFiles: mockClearFiles,
      getInputProps: mockGetInputProps,
    },
  ]),
}));

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

  beforeEach(() => {
    vi.clearAllMocks();
    mockFiles.length = 0; // Clear the array
  });

  it('renders task name and evidence requirement badge', () => {
    render(<TaskDialog {...defaultProps} />);
    
    expect(screen.getByText('Initial Meeting')).toBeInTheDocument();
    expect(screen.getByText('Evidence Required')).toBeInTheDocument();
  });

  it('initializes notes field with task.evidence_notes', async () => {
    render(<TaskDialog {...defaultProps} />);
    
    // Find notes area
    const notesArea = screen.getByPlaceholderText(/What progress have you made/);
    expect(notesArea).toHaveValue('Initial progress note');
  });

  it('calls onSubmitEvidence when "Submit for Review" is clicked', async () => {
    const user = userEvent.setup();
    const onSubmitEvidence = vi.fn().mockResolvedValue(undefined);
    
    // Mock files being present
    const testFile = new File(['hello'], 'test.png', { type: 'image/png' });
    mockFiles.push({ file: testFile, id: '1', preview: '' });

    render(<TaskDialog {...defaultProps} onSubmitEvidence={onSubmitEvidence} />);
    
    // 1. Update notes
    const notesArea = screen.getByPlaceholderText(/What progress have you made/);
    await user.clear(notesArea);
    await user.type(notesArea, 'Updated progress note');
    
    // 3. Click submit
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
        files: [testFile]
      }),
      true
    );
  });

  it('renders "Complete Task" instead of "Submit for Review" when no submission is required', async () => {
    const noSubmissionTask = {
      ...mockTask,
      evidence_type: {
        id: 'et2',
        name: 'Discussion',
        requires_submission: false
      }
    };
    
    render(<TaskDialog {...defaultProps} task={noSubmissionTask} />);
    
    const completeBtn = screen.getByText('Complete Task');
    expect(completeBtn).toBeInTheDocument();
    expect(screen.queryByText('Submit for Review')).not.toBeInTheDocument();
  });

  it('calls onSubmitEvidence with submitForReview=false when "Save Draft" is clicked', async () => {
    const user = userEvent.setup();
    const onSubmitEvidence = vi.fn().mockResolvedValue(undefined);
    render(<TaskDialog {...defaultProps} onSubmitEvidence={onSubmitEvidence} />);
    
    // 1. Update notes
    const notesArea = screen.getByPlaceholderText(/What progress have you made/);
    await user.type(notesArea, '...more');
    
    // 2. Click Save Draft
    const saveButton = screen.getByText('Save Draft');
    // The component uses hasChanges logic which now depends on onFilesChange from useFileUpload
    // We'll just wait for it to be enabled in this test
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
    const revisionTask = {
      ...mockTask,
      status: 'revision_required' as const,
      rejection_reason: 'Please upload a clearer photo'
    };
    
    render(<TaskDialog {...defaultProps} task={revisionTask} />);
    
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
