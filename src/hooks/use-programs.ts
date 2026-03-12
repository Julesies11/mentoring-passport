import { useQuery } from '@tanstack/react-query';
import { useOrganisation } from '@/providers/organisation-provider';
import { fetchPrograms, fetchAssignedPrograms, fetchProgram } from '@/lib/api/programs';

export function usePrograms() {
  const { activeOrganisation } = useOrganisation();
  const organisationId = activeOrganisation?.id;

  return useQuery({
    queryKey: ['programs', organisationId],
    queryFn: () => fetchPrograms(organisationId!),
    enabled: !!organisationId,
  });
}

export function useAssignedPrograms() {
  const { activeOrganisation } = useOrganisation();
  const organisationId = activeOrganisation?.id;

  return useQuery({
    queryKey: ['assigned-programs', organisationId],
    queryFn: () => fetchAssignedPrograms(organisationId!),
    enabled: !!organisationId,
  });
}

export function useProgram(id?: string) {
  return useQuery({
    queryKey: ['program', id],
    queryFn: () => fetchProgram(id!),
    enabled: !!id,
  });
}
