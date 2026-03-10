import { render } from './utils';
import { describe, it, expect, vi } from 'vitest';

// Import major pages to test their module resolution and initialization
import { SupervisorDashboardPage } from '@/pages/supervisor/dashboard-page';
import { ParticipantsPage } from '@/pages/supervisor/participants-page';
import { PairsPage } from '@/pages/supervisor/pairs-page';
import { EvidenceReviewPage } from '@/pages/supervisor/evidence-review-page';
import { SupervisorChecklistPage } from '@/pages/supervisor/checklist-page';
import { ProgramMemberTasksPage } from '@/pages/program-member/tasks-page';
import { ProgramMemberMeetingsPage } from '@/pages/program-member/meetings-page';

// Mock some complex chart components or heavy libraries that might fail in JSDOM
vi.mock('react-apexcharts', () => ({
  default: () => <div data-testid="mock-chart" />
}));

// We don't need to navigate, just try to RENDER the component in a provider context
// This will catch:
// 1. ReferenceErrors (variable used before init)
// 2. Module resolution errors (bad imports/exports)
// 3. Syntax errors in the component tree

describe('Comprehensive Smoke Test (White Screen Prevention)', () => {
  
  describe('Supervisor Pages', () => {
    it('Supervisor Dashboard renders without crashing', () => {
      render(<SupervisorDashboardPage />);
      expect(true).toBe(true);
    });

    it('Participants Page renders without crashing', () => {
      render(<ParticipantsPage />);
      expect(true).toBe(true);
    });

    it('Pairs Page renders without crashing', () => {
      render(<PairsPage />);
      expect(true).toBe(true);
    });

    it('Evidence Review Page renders without crashing', () => {
      render(<EvidenceReviewPage />);
      expect(true).toBe(true);
    });

    it('Supervisor Checklist renders without crashing', () => {
      render(<SupervisorChecklistPage />);
      expect(true).toBe(true);
    });
  });

  describe('Program Member Pages', () => {
    it('Tasks Page renders without crashing', () => {
      render(<ProgramMemberTasksPage />, {
        authValue: { isSupervisor: false, isMentee: true, isMentor: false }
      });
      expect(true).toBe(true);
    });

    it('Meetings Page renders without crashing', () => {
      render(<ProgramMemberMeetingsPage />, {
        authValue: { isSupervisor: false, isMentee: true, isMentor: false }
      });
      expect(true).toBe(true);
    });
  });
});
