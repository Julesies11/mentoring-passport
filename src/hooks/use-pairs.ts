import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchPairs,
  fetchPair,
  fetchUserPairs,
  createPair,
  updatePair,
  archivePair,
  fetchPairStats,
  type CreatePairInput,
  type UpdatePairInput,
} from '@/lib/api/pairs';

export function usePairs() {
  const queryClient = useQueryClient();

  const { data: pairs = [], isLoading, error } = useQuery({
    queryKey: ['pairs'],
    queryFn: fetchPairs,
  });

  const { data: stats } = useQuery({
    queryKey: ['pairs', 'stats'],
    queryFn: fetchPairStats,
  });

  const fetchUserPairsQuery = (userId: string) => {
    return useQuery({
      queryKey: ['pairs', 'user', userId],
      queryFn: () => fetchUserPairs(userId),
      enabled: !!userId,
    });
  };

  const createMutation = useMutation({
    mutationFn: createPair,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pairs'] });
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

  return {
    pairs,
    stats,
    isLoading,
    error,
    createPair: createMutation.mutate,
    updatePair: (id: string, input: UpdatePairInput) =>
      updateMutation.mutate({ id, input }),
    archivePair: archiveMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isArchiving: archiveMutation.isPending,
  };
}

export function useUserPairs(userId: string) {
  return useQuery({
    queryKey: ['pairs', 'user', userId],
    queryFn: () => fetchUserPairs(userId),
    enabled: !!userId,
  });
}

export function usePair(id: string) {
  return useQuery({
    queryKey: ['pairs', id],
    queryFn: () => fetchPair(id),
    enabled: !!id,
  });
}
