import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { AdminOrganisationsContent } from './components/admin-organisations-content';

export function AdminOrganisationsPage() {
  return (
    <>
      <div className="hidden sm:block">
        <Container>
          <Toolbar>
            <ToolbarHeading
              title="Organisation Management"
              description="Manage all mentoring organisations in the system"
            />
            <ToolbarActions>
              {/* Toolbar specific actions */}
            </ToolbarActions>
          </Toolbar>
        </Container>
      </div>

      <Container className="sm:mt-0">
        <AdminOrganisationsContent />
      </Container>
    </>
  );
}
