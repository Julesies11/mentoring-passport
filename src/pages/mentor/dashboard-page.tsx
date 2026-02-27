import { Fragment } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { MentorDashboardContent } from './components/mentor-dashboard-content';

export function MentorDashboardPage() {
  const { user } = useAuth();

  return (
    <Fragment>
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
    </Fragment>
  );
}
