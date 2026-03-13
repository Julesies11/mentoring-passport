import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { OrgSettingsContent } from './components/org-settings-content';
import { ProgramSelector } from '@/components/common/program-selector';

export function OrgSettingsPage() {
  return (
    <>
      <div className="hidden sm:block">
        <Container>
          <Toolbar>
            <ToolbarHeading
              title="Organisation Settings"
              description="Manage your hospital's profile and preferences"
            />
            <ToolbarActions>
              <ProgramSelector />
            </ToolbarActions>
          </Toolbar>
        </Container>
      </div>

      <Container className="sm:mt-0">
        <OrgSettingsContent />
      </Container>
    </>
  );
}
