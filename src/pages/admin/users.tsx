import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { AdminUsersContent } from './components/admin-users-content';

export function AdminUsersPage() {
  return (
    <>
      <div className="hidden sm:block">
        <Container>
          <Toolbar>
            <ToolbarHeading
              title="Global User Management"
              description="View and manage all users across all organisations"
            />
            <ToolbarActions>
               {/* Global actions */}
            </ToolbarActions>
          </Toolbar>
        </Container>
      </div>

      <Container className="sm:mt-0">
        <AdminUsersContent />
      </Container>
    </>
  );
}
