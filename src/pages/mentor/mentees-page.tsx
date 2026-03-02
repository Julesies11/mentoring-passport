import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { MenteesListContent } from './components/mentees-list-content';

export function MentorMenteesPage() {
  return (
    <>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="My Mentees"
            description="Manage and track your mentoring relationships"
          />
          <ToolbarActions>
            {/* Future actions */}
          </ToolbarActions>
        </Toolbar>
      </Container>
      <Container>
        <MenteesListContent />
      </Container>
    </>
  );
}
