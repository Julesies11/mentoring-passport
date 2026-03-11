import { render } from './utils';
import { describe, it, expect, vi } from 'vitest';
import { waitFor } from '@testing-library/react';

// Supervisor Pages
import { SupervisorDashboardPage } from '@/pages/supervisor/dashboard-page';
import { ParticipantsPage } from '@/pages/supervisor/participants-page';
import { PairsPage } from '@/pages/supervisor/pairs-page';
import { EvidenceReviewPage } from '@/pages/supervisor/evidence-review-page';
import { SupervisorChecklistPage } from '@/pages/supervisor/checklist-page';
import { SupervisorMasterTasksPage } from '@/pages/supervisor/master-tasks-page';
import { SupervisorCalendarPage } from '@/pages/supervisor/calendar-page';
import { SupervisorErrorLogsPage } from '@/pages/supervisor/error-logs-page';
import { OrganisationSettingsPage } from '@/pages/supervisor/organisation-settings-page';

// Program Member Pages
import { ProgramMemberDashboardPage } from '@/pages/dashboards/program-member-dashboard';
import { ProgramMemberTasksPage } from '@/pages/program-member/tasks-page';
import { ProgramMemberMeetingsPage } from '@/pages/program-member/meetings-page';
import { ProgramMemberRelationshipPage } from '@/pages/program-member/relationship-page';

// Profile Pages
import { EditProfilePage } from '@/pages/profile/edit-profile';

// Auth & Error (Need separate tests or mocked differently as they don't use Demo1Layout typically)
// For simplicity in this smoke test, we'll focus on the core authenticated pages that share complex layout/hooks.

// Mock complex chart components or heavy libraries that might fail in JSDOM
vi.mock('react-apexcharts', () => ({
  default: () => <div data-testid="mock-chart" />
}));

describe('Comprehensive Smoke Test (White Screen Prevention)', () => {
  
  describe('Supervisor Pages', () => {
    it('Supervisor Dashboard renders without crashing', async () => {
      const { container } = render(<SupervisorDashboardPage />);
      await waitFor(() => {
        expect(container).not.toBeEmptyDOMElement();
      });
    });

    it('Participants Page renders without crashing', async () => {
      const { container } = render(<ParticipantsPage />);
      await waitFor(() => {
        expect(container).not.toBeEmptyDOMElement();
      });
    });

    it('Pairs Page renders without crashing', async () => {
      const { container } = render(<PairsPage />);
      await waitFor(() => {
        expect(container).not.toBeEmptyDOMElement();
      });
    });

    it('Master Tasks Page renders without crashing', async () => {
      const { container } = render(<SupervisorMasterTasksPage />);
      await waitFor(() => {
        expect(container).not.toBeEmptyDOMElement();
      });
    });

    it('Evidence Review Page renders without crashing', async () => {
      const { container } = render(<EvidenceReviewPage />);
      await waitFor(() => {
        expect(container).not.toBeEmptyDOMElement();
      });
    });

    it('Supervisor Calendar renders without crashing', async () => {
      const { container } = render(<SupervisorCalendarPage />);
      await waitFor(() => {
        expect(container).not.toBeEmptyDOMElement();
      });
    });

    it('Supervisor Checklist renders without crashing', async () => {
      const { container } = render(<SupervisorChecklistPage />);
      await waitFor(() => {
        expect(container).not.toBeEmptyDOMElement();
      });
    });

    it('Error Logs Page renders without crashing', async () => {
      const { container } = render(<SupervisorErrorLogsPage />);
      await waitFor(() => {
        expect(container).not.toBeEmptyDOMElement();
      });
    });

    it('Organisation Settings renders without crashing', async () => {
      const { container } = render(<OrganisationSettingsPage />);
      await waitFor(() => {
        expect(container).not.toBeEmptyDOMElement();
      });
    });
  });

  describe('Program Member Pages', () => {
    const memberAuth = { isSupervisor: false, isMentee: true, isMentor: false };

    it('Dashboard Page renders without crashing', async () => {
      const { container } = render(<ProgramMemberDashboardPage />, { authValue: memberAuth });
      await waitFor(() => {
        expect(container).not.toBeEmptyDOMElement();
      });
    });

    it('Tasks Page renders without crashing', async () => {
      const { container } = render(<ProgramMemberTasksPage />, { authValue: memberAuth });
      await waitFor(() => {
        expect(container).not.toBeEmptyDOMElement();
      });
    });

    it('Meetings Page renders without crashing', async () => {
      const { container } = render(<ProgramMemberMeetingsPage />, { authValue: memberAuth });
      await waitFor(() => {
        expect(container).not.toBeEmptyDOMElement();
      });
    });

    it('Relationship Page renders without crashing', async () => {
      const { container } = render(<ProgramMemberRelationshipPage />, { authValue: memberAuth });
      await waitFor(() => {
        expect(container).not.toBeEmptyDOMElement();
      });
    });
  });

  describe('Shared Pages', () => {
    it('Edit Profile Page renders without crashing', async () => {
      const { container } = render(<EditProfilePage />);
      await waitFor(() => {
        expect(container).not.toBeEmptyDOMElement();
      });
    });
  });
});
