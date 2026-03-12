import { Container } from '@/components/common/container';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { OrgAdminDashboardContent } from './components/org-admin-dashboard-content';

export function OrgAdminDashboardPage() {
  return (
    <>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Organisation Dashboard"
            description="Overview of hospital mentoring performance and governance"
          />
        </Toolbar>
      </Container>
      
      <Container>
        <OrgAdminDashboardContent />
      </Container>
    </>
  );
}
