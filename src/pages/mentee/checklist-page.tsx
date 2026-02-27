import { Fragment } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useUserPairs } from '@/hooks/use-pairs';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { ChecklistContent } from './components/checklist-content';

export function ChecklistPage() {
  const { user } = useAuth();
  const { data: pairs = [] } = useUserPairs(user?.id || '');
  const activePair = pairs.find(p => p.status === 'active');

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="My Checklist"
            description={
                activePair 
                ? `Track your mentoring journey with ${activePair.mentor?.full_name || 'your mentor'}`
                : "Manage your development tasks"
            }
          />
          <ToolbarActions>
            {/* Actions if needed */}
          </ToolbarActions>
        </Toolbar>
      </Container>
      <Container>
        <ChecklistContent />
      </Container>
    </Fragment>
  );
}
