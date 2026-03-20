import { render, screen } from '@/test/utils';
import { TaskDialog } from '../task-dialog';
import { TaskProgressGrid } from '../task-progress-grid';
import { TASK_STATUS } from '@/config/constants';
import { describe, it, expect, vi } from 'vitest';

describe('Task Audit UI Tests', () => {
  const mockTask = {
    id: 't1',
    name: 'Clinical Competency',
    status: TASK_STATUS.COMPLETED as any,
    submitted_at: '2024-03-20T10:00:00Z',
    submitted_by: { id: 'u1', full_name: 'John Mentee' },
    last_reviewed_at: '2024-03-21T14:00:00Z',
    last_reviewed_by: { id: 's1', full_name: 'Dr. Supervisor' },
    last_action: 'approved',
    evidence_type: { id: 'et1', name: 'File', requires_submission: true }
  };

  describe('TaskDialog Audit Section', () => {
    it('displays the full chain of custody for completed tasks', () => {
      render(
        <TaskDialog 
          open={true} 
          onOpenChange={vi.fn()} 
          task={mockTask} 
          pairId="p1" 
          onSubmitEvidence={vi.fn()} 
        />
      );

      expect(screen.getByText(/Submitted By/i)).toBeInTheDocument();
      expect(screen.getByText('John Mentee')).toBeInTheDocument();
      expect(screen.getByText(/Approved By/i)).toBeInTheDocument();
      expect(screen.getByText('Dr. Supervisor')).toBeInTheDocument();
    });

    it('displays submission details for tasks awaiting review', () => {
      const inReviewTask = { 
        ...mockTask, 
        status: TASK_STATUS.AWAITING_REVIEW as any 
      };
      
      render(
        <TaskDialog 
          open={true} 
          onOpenChange={vi.fn()} 
          task={inReviewTask} 
          pairId="p1" 
          onSubmitEvidence={vi.fn()} 
        />
      );

      expect(screen.getByText('Submission Details')).toBeInTheDocument();
      expect(screen.getByText('John Mentee')).toBeInTheDocument();
    });
  });

  describe('TaskProgressGrid Audit Labels', () => {
    it('shows "Submitted by" and "Approved by" labels in the grid', () => {
      render(
        <TaskProgressGrid 
          tasks={[mockTask]} 
          expandedTasks={new Set()} 
          onToggleExpand={vi.fn()} 
          onViewDetails={vi.fn()}
          readOnly={true}
        />
      );

      // Check for desktop labels
      expect(screen.getByText(/Submitted by John Mentee/i)).toBeInTheDocument();
      expect(screen.getByText(/Approved by Dr. Supervisor/i)).toBeInTheDocument();
    });

    it('shows "Rejected by" when last_action is rejected', () => {
      const rejectedTask = { 
        ...mockTask, 
        status: TASK_STATUS.REVISION_REQUIRED as any,
        last_action: 'rejected'
      };

      render(
        <TaskProgressGrid 
          tasks={[rejectedTask]} 
          expandedTasks={new Set()} 
          onToggleExpand={vi.fn()} 
          onViewDetails={vi.fn()}
          readOnly={true}
        />
      );

      expect(screen.getByText(/Rejected by Dr. Supervisor/i)).toBeInTheDocument();
    });
  });
});
