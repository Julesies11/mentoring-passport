import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { ParticipantsContent } from './components/participants-content';

export function ParticipantsPage() {
  return (
    <>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Participants"
            description="Manage mentors, mentees, and supervisors"
          />
          <ToolbarActions>
            {/* Action buttons are handled inside ParticipantsContent or can be moved here */}
          </ToolbarActions>
        </Toolbar>
      </Container>
      <Container>
        <ParticipantsContent />
      </Container>
    </>
  );
}
