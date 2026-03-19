import React, { useCallback } from 'react';
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
    staleTime: 1000 * 60 * 5, // 5 minutes
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

  const assignToProgramCallback = useCallback(assignMutation.mutateAsync, [assignMutation]);
  const removeFromProgramCallback = useCallback(removeMutation.mutateAsync, [removeMutation]);

  return {
    supervisors,
    isLoading,
    assignToProgram: assignToProgramCallback,
    removeFromProgram: removeFromProgramCallback,
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
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: stats } = useQuery({
    queryKey: ['participants', 'stats', programId],
    queryFn: () => fetchParticipantStats(programId),
    enabled: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
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

  const createParticipantCallback = useCallback(createMutation.mutate, [createMutation]);
  const updateParticipantCallback = useCallback((id: string, input: UpdateParticipantInput) =>
    updateMutation.mutate({ id, input }), [updateMutation]);
  const archiveParticipantCallback = useCallback(archiveMutation.mutate, [archiveMutation]);
  const restoreParticipantCallback = useCallback(restoreMutation.mutate, [restoreMutation]);
  const createParticipantAsyncCallback = useCallback(createMutation.mutateAsync, [createMutation]);
  const updateParticipantAsyncCallback = useCallback((id: string, input: UpdateParticipantInput) =>
    updateMutation.mutateAsync({ id, input }), [updateMutation]);

  return {
    participants,
    stats,
    isLoading,
    error,
    createParticipant: createParticipantCallback,
    updateParticipant: updateParticipantCallback,
    archiveParticipant: archiveParticipantCallback,
    restoreParticipant: restoreParticipantCallback,
    createParticipantAsync: createParticipantAsyncCallback,
    updateParticipantAsync: updateParticipantAsyncCallback,
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
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useAllParticipants(programId?: string) {
  return useQuery({
    queryKey: ['participants', 'all', programId],
    queryFn: () => fetchParticipants(programId),
    enabled: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useParticipantsByRole(role: 'supervisor' | 'program-member') {
  return useQuery({
    queryKey: ['participants', 'role', role],
    queryFn: () => fetchParticipantsByRole(role),
    enabled: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
