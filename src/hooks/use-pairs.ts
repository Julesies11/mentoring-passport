import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganisation } from '@/providers/organisation-provider';
import { useAuth } from '@/auth/context/auth-context';
import {
  fetchPairs,
  fetchPair,
  fetchUserPairs,
  createPair,
  updatePair,
  archivePair,
  restorePair,
  fetchPairStats,
  type UpdatePairInput,
} from '@/lib/api/pairs';

const EMPTY_ARRAY: any[] = [];

export function usePairs() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeProgram, activeOrganisation } = useOrganisation();
  const programId = activeProgram?.id;
  const orgId = activeOrganisation?.id;

  const { data: pairs = EMPTY_ARRAY, isLoading, error } = useQuery({
    queryKey: ['pairs', programId, orgId],
    queryFn: () => fetchPairs(programId, orgId),
    enabled: !!(programId || orgId || user?.role === 'administrator'),
  });

  const { data: stats } = useQuery({
    queryKey: ['pairs', 'stats', programId, orgId],
    queryFn: () => fetchPairStats(programId, orgId),
    enabled: !!(programId || orgId || user?.role === 'administrator'),
  });

  const createMutation = useMutation({
    mutationFn: (input: CreatePairInput) => {
      if (!input.program_id) {
        throw new Error('Please select a program before creating a pairing.');
      }
      return createPair(input);
    },
    onSuccess: async (newPair) => {
      queryClient.invalidateQueries({ queryKey: ['pairs'] });
      
      // Notify participants about new pairing
      // We need names which might be in the returned newPair or fetched
      const pair = newPair as any;
      if (pair.mentor?.full_name && pair.mentee?.full_name) {
        // Welcoming participants logic could be added to NotificationService
        // For now, it's just helpful to know it's ready.
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

  return {
    pairs,
    stats,
    isLoading,
    error,
    createPair: (input: any) => createMutation.mutate({ ...input, program_id: programId }),
    createPairAsync: (input: any) => createMutation.mutateAsync({ ...input, program_id: programId }),
    updatePair: (id: string, input: UpdatePairInput) =>
      updateMutation.mutate({ id, input }),
    updatePairAsync: (id: string, input: UpdatePairInput) =>
      updateMutation.mutateAsync({ id, input }),
    archivePair: archiveMutation.mutate,
    archivePairAsync: archiveMutation.mutateAsync,
    restorePair: restoreMutation.mutate,
    restorePairAsync: restoreMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isArchiving: archiveMutation.isPending,
    isRestoring: restoreMutation.isPending,
  };
}

export function useUserPairs(userId: string) {
  return useQuery({
    queryKey: ['pairs', 'user', userId],
    queryFn: () => fetchUserPairs(userId),
    enabled: !!userId,
    select: (pairs) => {
      return [...pairs].sort((a, b) => {
        // 1. Active Pair + Active Program first
        const aActive = a.status === 'active' && a.program?.status === 'active';
        const bActive = b.status === 'active' && b.program?.status === 'active';
        
        if (aActive && !bActive) return -1;
        if (!aActive && bActive) return 1;

        // 2. Program date (latest start_date at top)
        const aDate = a.program?.start_date ? new Date(a.program.start_date).getTime() : 0;
        const bDate = b.program?.start_date ? new Date(b.program.start_date).getTime() : 0;
        
        if (aDate !== bDate) return bDate - aDate;

        // 3. Name alphabetical
        const aName = (userId === a.mentor_id ? a.mentee?.full_name : a.mentor?.full_name) || '';
        const bName = (userId === b.mentor_id ? b.mentee?.full_name : b.mentor?.full_name) || '';
        
        return aName.localeCompare(bName);
      });
    }
  });
}

/**
 * Specifically for the Dashboard: only show relationships where BOTH the pair and the program are active.
 */
export function useActiveUserPairs(userId: string) {
  return useQuery({
    queryKey: ['pairs', 'user', userId, 'active-only'],
    queryFn: () => fetchUserPairs(userId),
    enabled: !!userId,
    select: (pairs) => {
      return pairs.filter(p => p.status === 'active' && p.program?.status === 'active');
    }
  });
}

export function useAllPairs() {
  return useQuery({
    queryKey: ['pairs'],
    queryFn: () => fetchPairs(),
  });
}

export function usePair(id: string) {
  return useQuery({
    queryKey: ['pairs', id],
    queryFn: () => fetchPair(id),
    enabled: !!id,
  });
}
