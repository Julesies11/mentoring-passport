import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/context/auth-context';
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

  const { data: supervisors = [], isLoading } = useQuery({
    queryKey: ['org-supervisors'],
    queryFn: () => fetchOrgSupervisors(),
    enabled: true,
  });

  const assignMutation = useMutation({
    mutationFn: ({ userId, programId }: { userId: string; programId: string }) => 
      assignSupervisorToProgram(userId, programId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-supervisors'] });
    }
  });

  const removeMutation = useMutation({
    mutationFn: ({ userId, programId }: { userId: string; programId: string }) => 
      removeSupervisorFromProgram(userId, programId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-supervisors'] });
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

export function useParticipants(programId?: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: participants = EMPTY_ARRAY, isLoading, error } = useQuery({
    queryKey: ['participants', programId],
    queryFn: () => fetchParticipants(programId),
    enabled: true,
  });

  const { data: stats } = useQuery({
    queryKey: ['participants', 'stats', programId],
    queryFn: () => fetchParticipantStats(programId),
    enabled: true,
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
  return useQuery({
    queryKey: ['participants', id],
    queryFn: () => fetchParticipant(id),
    enabled: !!id,
  });
}

export function useAllParticipants(programId?: string) {
  return useQuery({
    queryKey: ['participants', 'all', programId],
    queryFn: () => fetchParticipants(programId),
    enabled: true,
  });
}

export function useParticipantsByRole(role: 'supervisor' | 'program-member') {
  return useQuery({
    queryKey: ['participants', 'role', role],
    queryFn: () => fetchParticipantsByRole(role),
    enabled: true,
  });
}
