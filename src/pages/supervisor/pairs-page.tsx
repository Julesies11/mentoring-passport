import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { PairsContent } from './components/pairs-content';

export function PairsPage() {
  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Mentoring Pairs"
            description="Manage mentor-mentee pairings and track their progress"
          />
          <ToolbarActions>
            {/* Action buttons are handled inside PairsContent or can be moved here */}
          </ToolbarActions>
        </Toolbar>
      </Container>
      <Container>
        <PairsContent />
      </Container>
    </Fragment>
  );
}
