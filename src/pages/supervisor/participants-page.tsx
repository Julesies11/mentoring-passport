import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { ParticipantsContent } from './components/participants-content';
import { ProgramSelector } from '@/components/common/program-selector';
import { useOrganisation } from '@/providers/organisation-provider';
import { OrganisationLogo } from '@/components/common/organisation-logo';

interface ParticipantsPageProps {
  mode?: 'manage' | 'view';
}

export function ParticipantsPage({ mode = 'manage' }: ParticipantsPageProps) {
  const { activeOrganisation } = useOrganisation();

  return (
    <>
      <div className="hidden sm:block">
        <Container>
          <Toolbar>
            {mode === 'manage' ? (
              <div className="flex items-center gap-4">
                <OrganisationLogo 
                  orgId={activeOrganisation?.id || ''} 
                  logoPath={activeOrganisation?.logo_url} 
                  name={activeOrganisation?.name} 
                  size="md"
                  className="rounded-lg shadow-sm"
                />
                <ToolbarHeading
                  title={activeOrganisation?.name || "Manage Members"}
                  description="Manage mentors, mentees, and supervisors"
                />
              </div>
            ) : (
              <ToolbarHeading
                title="View Participants"
                description="Find and view program members for pairing"
              />
            )}
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
