import { useAuth } from '@/auth/context/auth-context';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { SupervisorDashboardContent } from './components/supervisor-dashboard-content';

export function SupervisorDashboardPage() {
  const { user } = useAuth();

  return (
    <>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Supervisor Dashboard"
            description={`Welcome back, ${user?.full_name || user?.email}`}
          />
          <ToolbarActions>
            {/* Add any actions here if needed in the future */}
          </ToolbarActions>
        </Toolbar>
      </Container>
      <Container>
        <SupervisorDashboardContent />
      </Container>
    </>
  );
}
