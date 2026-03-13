import { useAuth } from '@/auth/context/auth-context';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { SupervisorDashboardContent } from './components/supervisor-dashboard-content';
import { ProgramSelector } from '@/components/common/program-selector';

export function SupervisorDashboardPage() {
  const { user, isOrgAdmin } = useAuth();

  return (
    <>
      <div className="hidden sm:block" data-testid="dashboard-toolbar">
        <Container>
          <Toolbar>
            <div className="flex items-center gap-5">
              <ToolbarHeading
                title="Supervisor Hub"
                description={`Welcome back, ${user?.full_name || user?.email}`}
              />
              <ProgramSelector />
            </div>
            <ToolbarActions>
              {/* Other dashboard actions can go here */}
            </ToolbarActions>
          </Toolbar>
        </Container>
      </div>
      <Container className="sm:mt-0">
        <SupervisorDashboardContent />
      </Container>
    </>
  );
}
