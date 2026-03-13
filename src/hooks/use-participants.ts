import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/context/auth-context';
import { useOrganisation } from '@/providers/organisation-provider';
import { NotificationService } from '@/lib/api/notifications-service';
import {
  fetchParticipants,
  fetchParticipantsByRole,
  fetchParticipant,
  fetchOrgSupervisors,
  assignSupervisorToProgram,
  removeSupervisorFromProgram,
  createParticipant,
  updateParticipant,
  archiveParticipant,
  restoreParticipant,
  fetchParticipantStats,
  type UpdateParticipantInput,
} from '@/lib/api/participants';

const EMPTY_ARRAY: any[] = [];

export function useOrgSupervisors() {
  const queryClient = useQueryClient();
  const { activeOrganisation } = useOrganisation();
  const orgId = activeOrganisation?.id;

  const { data: supervisors = [], isLoading } = useQuery({
    queryKey: ['org-supervisors', orgId],
    queryFn: () => orgId ? fetchOrgSupervisors(orgId) : Promise.resolve([]),
    enabled: !!orgId,
  });

  const assignMutation = useMutation({
    mutationFn: ({ userId, programId }: { userId: string; programId: string }) => 
      assignSupervisorToProgram(userId, programId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-supervisors', orgId] });
    }
  });

  const removeMutation = useMutation({
    mutationFn: ({ userId, programId }: { userId: string; programId: string }) => 
      removeSupervisorFromProgram(userId, programId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-supervisors', orgId] });
    }
  });

  return {
    supervisors,
    isLoading,
    assignToProgram: assignMutation.mutateAsync,
    removeFromProgram: removeMutation.mutateAsync,
    isAssigning: assignMutation.isPending,
    isRemoving: removeMutation.isPending
  };
}

export function useParticipants() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeOrganisation } = useOrganisation();
  
  const orgId = activeOrganisation?.id;

  const { data: participants = EMPTY_ARRAY, isLoading, error } = useQuery({
    queryKey: ['participants', orgId],
    queryFn: () => fetchParticipants(orgId),
    enabled: !!orgId && typeof orgId === 'string' && orgId !== '[object Object]',
  });

  const { data: stats } = useQuery({
    queryKey: ['participants', 'stats', orgId],
    queryFn: () => fetchParticipantStats(orgId),
    enabled: !!orgId && typeof orgId === 'string' && orgId !== '[object Object]',
  });

  const createMutation = useMutation({
    mutationFn: createParticipant,
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ['participants'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateParticipantInput }) =>
      updateParticipant(id, input),
    onSuccess: async (updatedParticipant, variables) => {
      queryClient.invalidateQueries({ queryKey: ['participants'] });
      
      // Check for profile completion notification
      // A profile is "completed" for the first time when full_name and job_title are provided
      const oldParticipant = participants.find(p => p.id === variables.id);
      const isNewlyCompleted = (
        (!oldParticipant?.full_name || !oldParticipant?.job_title) &&
        (updatedParticipant.full_name && updatedParticipant.job_title)
      );

      if (isNewlyCompleted && user?.id) {
        await NotificationService.notifyProfileCompleted(updatedParticipant.id, updatedParticipant.full_name, user.id);
      }
    },
  });

  const archiveMutation = useMutation({
    mutationFn: archiveParticipant,
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ['participants'] });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: restoreParticipant,
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ['participants'] });
    },
  });

  return {
    participants,
    stats,
    isLoading,
    error,
    createParticipant: createMutation.mutate,
    updateParticipant: (id: string, input: UpdateParticipantInput) =>
      updateMutation.mutate({ id, input }),
    archiveParticipant: archiveMutation.mutate,
    restoreParticipant: restoreMutation.mutate,
    createParticipantAsync: createMutation.mutateAsync,
    updateParticipantAsync: (id: string, input: UpdateParticipantInput) =>
      updateMutation.mutateAsync({ id, input }),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isArchiving: archiveMutation.isPending,
    isRestoring: restoreMutation.isPending,
  };
}

export function useParticipant(id: string) {
  const { activeOrganisation } = useOrganisation();
  const orgId = activeOrganisation?.id;

  return useQuery({
    queryKey: ['participants', id, orgId],
    queryFn: () => fetchParticipant(id, orgId),
    enabled: !!id,
  });
}

export function useAllParticipants() {
  return useQuery({
    queryKey: ['participants'],
    queryFn: () => fetchParticipants(),
  });
}

export function useParticipantsByRole(role: 'supervisor' | 'program-member') {
  const { activeOrganisation } = useOrganisation();
  const orgId = activeOrganisation?.id;

  return useQuery({
    queryKey: ['participants', 'role', role, orgId],
    queryFn: () => fetchParticipantsByRole(role, orgId),
    enabled: !!orgId && typeof orgId === 'string' && orgId !== '[object Object]',
  });
}
