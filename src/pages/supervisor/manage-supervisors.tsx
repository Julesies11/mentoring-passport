import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { ManageSupervisorsContent } from './components/manage-supervisors-content';

export function ManageSupervisorsPage() {
  return (
    <>
      <div className="hidden sm:block">
        <Container>
          <Toolbar>
            <ToolbarHeading
              title="Supervisor Directory"
              description="Manage all users with the supervisor role in the organisation"
            />
          </Toolbar>
        </Container>
      </div>

      <Container className="sm:mt-0">
        <ManageSupervisorsContent />
      </Container>
    </>
  );
}
