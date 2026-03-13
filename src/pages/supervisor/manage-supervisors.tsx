import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { ManageSupervisorsContent } from './components/manage-supervisors-content';
import { ProgramSelector } from '@/components/common/program-selector';

export function ManageSupervisorsPage() {
  return (
    <>
      <div className="hidden sm:block">
        <Container>
          <Toolbar>
            <div className="flex items-center gap-5">
              <ToolbarHeading
                title="Supervisor Directory"
                description="Manage all users with the supervisor role in the organisation"
              />
              <ProgramSelector />
            </div>
            <ToolbarActions>
              {/* Other directory actions if any */}
            </ToolbarActions>
          </Toolbar>
        </Container>
      </div>

      <Container className="sm:mt-0">
        <ManageSupervisorsContent />
      </Container>
    </>
  );
}
