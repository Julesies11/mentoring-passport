import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { ParticipantsContent } from './components/participants-content';

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
              {/* Action buttons are handled inside ParticipantsContent or can be moved here */}
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
