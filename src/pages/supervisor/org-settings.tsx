import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { OrgSettingsContent } from './components/org-settings-content';

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
              {/* Actions could go here */}
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
