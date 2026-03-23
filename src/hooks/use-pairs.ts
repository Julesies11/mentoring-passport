import React, { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganisation } from '@/providers/organisation-provider';
import { useAuth } from '@/auth/context/auth-context';
import { NotificationService } from '@/lib/api/notifications-service';
import {
  fetchPairs,
  fetchPair,
  fetchUserPairs,
  createPair,
  updatePair,
  archivePair,
  restorePair,
  type UpdatePairInput,
  type CreatePairInput,
} from '@/lib/api/pairs';

const EMPTY_ARRAY: any[] = [];

export function usePairs() {
  const queryClient = useQueryClient();
  const { activeProgram } = useOrganisation();
  const { user } = useAuth();
  const programId = activeProgram?.id;

  const { data: pairs = EMPTY_ARRAY, isLoading, error } = useQuery({
    queryKey: ['pairs', programId],
    queryFn: () => fetchPairs(programId),
    enabled: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const stats = useMemo(() => {
    return {
      total: pairs.length,
      active: pairs.filter(p => p.status === 'active').length,
      archived: pairs.filter(p => p.status === 'archived').length,
    };
  }, [pairs]);

  const createMutation = useMutation({
    mutationFn: (input: CreatePairInput) => {
      if (!input.program_id) {
        throw new Error('Please select a program before creating a pairing.');
      }
      return createPair(input);
    },
    onSuccess: async (newPair) => {
      queryClient.invalidateQueries({ queryKey: ['pairs'] });
      
      if (newPair && user?.id) {
        // 1. Notify Supervisors about the new pair
        await NotificationService.notifyPairCreated({
          pairId: newPair.id,
          programId: newPair.program_id,
          programName: newPair.program?.name || 'Program',
          mentorName: newPair.mentor?.full_name || 'Mentor',
          menteeName: newPair.mentee?.full_name || 'Mentee',
          actorId: user.id
        });

        // 2. Notify the Mentor and Mentee (Informational)
        await NotificationService.notifyRelationshipMatched({
          mentorId: newPair.mentor_id,
          menteeId: newPair.mentee_id,
          mentorName: newPair.mentor?.full_name || 'Mentor',
          menteeName: newPair.mentee?.full_name || 'Mentee',
          programName: newPair.program?.name || 'Program',
          programId: newPair.program_id,
          actorId: user.id
        });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePairInput }) =>
      updatePair(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pairs'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: archivePair,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pairs'] });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: restorePair,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pairs'] });
    },
  });

  const createPairCallback = useCallback((input: any) => createMutation.mutate({ ...input, program_id: programId }), [createMutation, programId]);
  const createPairAsyncCallback = useCallback((input: any) => createMutation.mutateAsync({ ...input, program_id: programId }), [createMutation, programId]);
  const updatePairCallback = useCallback((id: string, input: UpdatePairInput) =>
    updateMutation.mutate({ id, input }), [updateMutation]);
  const updatePairAsyncCallback = useCallback((id: string, input: UpdatePairInput) =>
    updateMutation.mutateAsync({ id, input }), [updateMutation]);
  const archivePairCallback = useCallback(archiveMutation.mutate, [archiveMutation]);
  const archivePairAsyncCallback = useCallback(archiveMutation.mutateAsync, [archiveMutation]);
  const restorePairCallback = useCallback(restoreMutation.mutate, [restoreMutation]);
  const restorePairAsyncCallback = useCallback(restoreMutation.mutateAsync, [restoreMutation]);

  return {
    pairs,
    stats,
    isLoading,
    error,
    createPair: createPairCallback,
    createPairAsync: createPairAsyncCallback,
    updatePair: updatePairCallback,
    updatePairAsync: updatePairAsyncCallback,
    archivePair: archivePairCallback,
    archivePairAsync: archivePairAsyncCallback,
    restorePair: restorePairCallback,
    restorePairAsync: restorePairAsyncCallback,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isArchiving: archiveMutation.isPending,
    isRestoring: restoreMutation.isPending,
  };
}

export function useUserPairs(userId: string) {
  const { loading: authLoading } = useAuth();

  const selectFn = useCallback((rawPairs: any[]) => {
    return [...rawPairs].sort((a, b) => {
      const aActive = a.status === 'active' && a.program?.status === 'active';
      const bActive = b.status === 'active' && b.program?.status === 'active';
      
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;

      const aDate = a.program?.start_date ? new Date(a.program.start_date).getTime() : 0;
      const bDate = b.program?.start_date ? new Date(b.program.start_date).getTime() : 0;
      
      if (aDate !== bDate) return bDate - aDate;

      const aName = (userId === a.mentor_id ? a.mentee?.full_name : a.mentor?.full_name) || '';
      const bName = (userId === b.mentor_id ? b.mentee?.full_name : b.mentor?.full_name) || '';
      
      return aName.localeCompare(bName);
    });
  }, [userId]);

  return useQuery({
    queryKey: ['pairs', 'user', userId],
    queryFn: () => fetchUserPairs(userId),
    enabled: !!userId && !authLoading,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    select: selectFn
  });
}

export function useActiveUserPairs(userId: string) {
  const { loading: authLoading } = useAuth();

  const selectFn = useCallback((pairs: any[]) => {
    return pairs.filter(p => p.status === 'active' && p.program?.status === 'active');
  }, []);

  return useQuery({
    queryKey: ['pairs', 'user', userId, 'active-only'],
    queryFn: () => fetchUserPairs(userId),
    enabled: !!userId && !authLoading,
    select: selectFn
  });
}

export function useAllPairs(programId?: string) {
  return useQuery({
    queryKey: ['pairs', programId],
    queryFn: () => fetchPairs(programId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function usePair(id: string) {
  return useQuery({
    queryKey: ['pairs', id],
    queryFn: () => fetchPair(id),
    enabled: !!id,
  });
}
