import { useAuth } from '@/auth/context/auth-context';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { PairsContent } from './components/pairs-content';
import { ProgramSelector } from '@/components/common/program-selector';

export function PairsPage() {
  const { isOrgAdmin } = useAuth();

  return (
    <>
      <div className="hidden sm:block">
        <Container>
          <Toolbar>
            <ToolbarHeading
              title="Mentoring Pairs"
              description="Manage mentor-mentee pairings and track their progress"
            />
            <ToolbarActions>
              {isOrgAdmin && <ProgramSelector />}
            </ToolbarActions>
          </Toolbar>
        </Container>
      </div>
      <Container className="sm:mt-0">
        <PairsContent />
      </Container>
    </>
  );
}
