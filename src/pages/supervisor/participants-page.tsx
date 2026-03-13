import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { ParticipantsContent } from './components/participants-content';
import { ProgramSelector } from '@/components/common/program-selector';

interface ParticipantsPageProps {
  mode?: 'manage' | 'view';
}

export function ParticipantsPage({ mode = 'manage' }: ParticipantsPageProps) {
  return (
    <>
      <div className="hidden sm:block">
        <Container>
          <Toolbar>
            <ToolbarHeading
              title={mode === 'manage' ? "Manage Members" : "View Participants"}
              description={mode === 'manage' ? "Manage mentors, mentees, and supervisors" : "Find and view program members for pairing"}
            />
            <ToolbarActions>
              {/* No program selector needed for member management */}
            </ToolbarActions>
          </Toolbar>
        </Container>
      </div>
      <Container className="sm:mt-0">
        <ParticipantsContent mode={mode} />
      </Container>
    </>
  );
}
