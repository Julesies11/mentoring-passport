import { Fragment } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { MenteeDashboardContent } from './components/mentee-dashboard-content';

export function MenteeDashboardPage() {
  const { user } = useAuth();

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Mentee Dashboard"
            description={`Welcome back, ${user?.full_name || user?.email}`}
          />
          <ToolbarActions>
            {/* Add any actions here if needed in the future */}
          </ToolbarActions>
        </Toolbar>
      </Container>
      <Container>
        <MenteeDashboardContent />
      </Container>
    </Fragment>
  );
}
