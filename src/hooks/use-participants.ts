import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchParticipants,
  fetchParticipantsByRole,
  fetchParticipant,
  createParticipant,
  updateParticipant,
  archiveParticipant,
  restoreParticipant,
  fetchParticipantStats,
  type CreateParticipantInput,
  type UpdateParticipantInput,
} from '@/lib/api/participants';

export function useParticipants() {
  const queryClient = useQueryClient();

  const { data: participants = [], isLoading, error } = useQuery({
    queryKey: ['participants'],
    queryFn: fetchParticipants,
  });

  const { data: stats } = useQuery({
    queryKey: ['participants', 'stats'],
    queryFn: fetchParticipantStats,
  });

  const createMutation = useMutation({
    mutationFn: createParticipant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateParticipantInput }) =>
      updateParticipant(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: archiveParticipant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants'] });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: restoreParticipant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants'] });
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

export function useAllParticipants() {
  return useQuery({
    queryKey: ['participants'],
    queryFn: fetchParticipants,
  });
}

export function useParticipantsByRole(role: 'supervisor' | 'mentor' | 'mentee') {
  return useQuery({
    queryKey: ['participants', 'role', role],
    queryFn: () => fetchParticipantsByRole(role),
  });
}
