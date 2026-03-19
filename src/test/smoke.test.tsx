import { ROLES } from '@/config/constants';
import { render } from './utils';
import { describe, it, expect, vi } from 'vitest';
import { waitFor } from '@testing-library/react';

// Supervisor Pages
import { SupervisorDashboardPage } from '@/pages/supervisor/dashboard-page';
import { ParticipantsPage } from '@/pages/supervisor/participants-page';
import { PairsPage } from '@/pages/supervisor/pairs-page';
import { EvidenceReviewPage } from '@/pages/supervisor/evidence-review-page';
import { SupervisorChecklistPage } from '@/pages/supervisor/checklist-page';
import { SupervisorProgramTasksPage } from '@/pages/supervisor/program-tasks-page';
import { SupervisorCalendarPage } from '@/pages/supervisor/calendar-page';
import { SupervisorErrorLogsPage } from '@/pages/supervisor/error-logs-page';

// Org Admin Pages
import { OrgAdminDashboardPage } from '@/pages/org-admin/dashboard';
import { OrgAdminProgramsPage } from '@/pages/org-admin/programs';
import { OrgAdminTaskTemplatesPage } from '@/pages/org-admin/task-templates';

// Program Member Pages
import { ProgramMemberDashboardPage } from '@/pages/dashboards/program-member-dashboard';
import { ProgramMemberTasksPage } from '@/pages/program-member/tasks-page';
import { ProgramMemberMeetingsPage } from '@/pages/program-member/meetings-page';
import { ProgramMemberRelationshipPage } from '@/pages/program-member/relationship-page';

// Shared Pages
import { EditProfilePage } from '@/pages/profile/edit-profile';

// Auth Pages
import { SignUpPage } from '@/auth/pages/signup-page';

// Admin Pages
import { AdminDashboardPage } from '@/pages/admin/dashboard';
import { AdminOrganisationsPage } from '@/pages/admin/organisations';
import { AdminUsersPage } from '@/pages/admin/users';

// Mock complex chart components or heavy libraries that might fail in JSDOM
vi.mock('react-apexcharts', () => ({
  default: () => <div data-testid="mock-chart" />
}));

describe('Comprehensive Smoke Test (White Screen Prevention)', () => {
  
  describe('Administrator Pages', () => {
    const adminAuth = { 
      role: ROLES.ADMINISTRATOR as any, 
      isSupervisor: true, 
      isOrgAdmin: true, 
      isSystemOwner: true, 
      isMentor: false, 
      isMentee: false,
      user: {
        id: 'admin-id',
        email: 'admin@test.com',
        role: ROLES.ADMINISTRATOR,
        is_admin: true,
        is_system_owner: true
      }
    };

    it('Admin Dashboard renders without crashing', async () => {
      const { container } = render(<AdminDashboardPage />, { authValue: adminAuth });
      await waitFor(() => {
        expect(container).not.toBeEmptyDOMElement();
      });
    });

    it('Admin Organisations Page renders without crashing', async () => {
      const { container } = render(<AdminOrganisationsPage />, { authValue: adminAuth });
      await waitFor(() => {
        expect(container).not.toBeEmptyDOMElement();
      });
    });
  });

  describe('Organisation Admin Pages', () => {
    const orgAdminAuth = { role: ROLES.ORG_ADMIN as any, isSupervisor: true, isOrgAdmin: true, isSystemOwner: false, isMentor: false, isMentee: false };

    it('Org Admin Dashboard renders without crashing', async () => {
      const { container } = render(<OrgAdminDashboardPage />, { authValue: orgAdminAuth });
      await waitFor(() => {
        expect(container).not.toBeEmptyDOMElement();
      });
    });

    it('Org Admin Programs renders without crashing', async () => {
      const { container } = render(<OrgAdminProgramsPage />, { authValue: orgAdminAuth });
      await waitFor(() => {
        expect(container).not.toBeEmptyDOMElement();
      });
    });

    it('Org Admin Task Templates renders without crashing', async () => {
      const { container } = render(<OrgAdminTaskTemplatesPage />, { authValue: orgAdminAuth });
      await waitFor(() => {
        expect(container).not.toBeEmptyDOMElement();
      });
    });

    it('Manage Members Page renders without crashing', async () => {
      const { container } = render(<ParticipantsPage mode="manage" />);
      await waitFor(() => {
        expect(container).not.toBeEmptyDOMElement();
      });
    });
    });

    describe('Supervisor Pages', () => {
    it('Supervisor Hub renders without crashing', async () => {
      const { container } = render(<SupervisorDashboardPage />);
      await waitFor(() => {
        expect(container).not.toBeEmptyDOMElement();
      });
    });

    it('View Participants Page renders without crashing', async () => {
      const { container } = render(<ParticipantsPage mode="view" />);
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

    it('Program Tasks Page renders without crashing', async () => {
      const { container } = render(<SupervisorProgramTasksPage />);
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

  describe('Auth Pages', () => {
    it('Signup Page renders without crashing', async () => {
      const { container } = render(<SignUpPage />);
      await waitFor(() => {
        expect(container).not.toBeEmptyDOMElement();
      });
    });
  });
});
