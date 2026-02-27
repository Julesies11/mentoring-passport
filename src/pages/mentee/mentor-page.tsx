import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { MentorInfoContent } from './components/mentor-info-content';

export function MenteeMentorPage() {
  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="My Mentor"
            description="View your mentor information and contact details"
          />
          <ToolbarActions>
            {/* Future actions */}
          </ToolbarActions>
        </Toolbar>
      </Container>
      <Container>
        <MentorInfoContent />
      </Container>
    </Fragment>
  );
}
