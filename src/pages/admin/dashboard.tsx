import { useAuth } from '@/auth/context/auth-context';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { AdminDashboardContent } from './components/admin-dashboard-content';

export function AdminDashboardPage() {
  const { user } = useAuth();

  return (
    <>
      <div className="hidden sm:block">
        <Container>
          <Toolbar>
            <ToolbarHeading
              title="Administrator Dashboard"
              description={`Global System Overview for ${user?.full_name || user?.email}`}
            />
            <ToolbarActions>
               {/* Dashboard specific actions could go here */}
            </ToolbarActions>
          </Toolbar>
        </Container>
      </div>
      
      <Container className="sm:mt-0">
        <AdminDashboardContent />
      </Container>
    </>
  );
}
