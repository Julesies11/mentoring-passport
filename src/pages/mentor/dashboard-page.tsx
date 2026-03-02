import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { MentorDashboardContent } from './components/mentor-dashboard-content';
import { useAuth } from '@/auth/context/auth-context';

export function MentorDashboardPage() {
  const { user } = useAuth();

  return (
    <>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Mentor Dashboard"
            description={`Welcome back, ${user?.full_name || user?.email}`}
          />
          <ToolbarActions>
            {/* Add any actions here if needed in the future */}
          </ToolbarActions>
        </Toolbar>
      </Container>
      <Container>
        <MentorDashboardContent />
      </Container>
    </>
  );
}
