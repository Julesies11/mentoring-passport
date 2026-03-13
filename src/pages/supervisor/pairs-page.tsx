import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { PairsContent } from './components/pairs-content';
import { ProgramSelector } from '@/components/common/program-selector';
import { useOrganisation } from '@/providers/organisation-provider';
import { KeenIcon } from '@/components/keenicons/keenicons';

export function PairsPage() {
  const { isLoading } = useOrganisation();

  if (isLoading) {
    return (
      <Container>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
          <KeenIcon icon="loading" className="animate-spin text-3xl mb-4" />
          <p className="font-bold uppercase text-[10px] tracking-widest">Loading program data...</p>
        </div>
      </Container>
    );
  }

  return (
    <>
      <div className="hidden sm:block">
        <Container>
          <Toolbar>
            <ToolbarHeading
              title="Mentoring Pairs"
              description="Manage mentor-mentee pairings and track their progress"
            />
            <ToolbarActions>
              <ProgramSelector />
            </ToolbarActions>
          </Toolbar>
        </Container>
      </div>
      <Container className="sm:mt-0">
        <PairsContent />
      </Container>
    </>
  );
}
