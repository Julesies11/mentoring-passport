import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchTasks,
  fetchPairTasks,
  fetchPairTaskStats,
  updatePairTaskStatus,
} from '@/lib/api/tasks';

export function useTasks() {
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
  });

  // Don't fetch all pair tasks - it causes infinite errors
  // Instead, fetch tasks per pair when needed
  const pairTasks: any[] = [];
  const isLoadingPairTasks = false;

  return {
    tasks,
    pairTasks,
    isLoading,
    isLoadingPairTasks,
    error,
    fetchPairTasks,
    fetchPairTaskStats,
    updatePairTaskStatus,
  };
}

export function usePairTasks(pairId: string) {
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['pair-tasks', pairId],
    queryFn: () => fetchPairTasks(pairId),
    enabled: !!pairId,
  });

  const { data: stats } = useQuery({
    queryKey: ['pair-tasks', pairId, 'stats'],
    queryFn: () => fetchPairTaskStats(pairId),
    enabled: !!pairId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: 'not_submitted' | 'awaiting_review' | 'completed' }) =>
      updatePairTaskStatus(taskId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pair-tasks', pairId] });
      queryClient.invalidateQueries({ queryKey: ['pair-tasks', pairId, 'stats'] });
    },
  });

  return {
    tasks,
    stats,
    isLoading,
    error,
    updateStatus: (taskId: string, status: 'not_submitted' | 'awaiting_review' | 'completed') =>
      updateStatusMutation.mutate({ taskId, status }),
    isUpdating: updateStatusMutation.isPending,
  };
}
