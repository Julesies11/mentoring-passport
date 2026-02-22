import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchTasks,
  fetchPairTasks,
  fetchPairTaskStats,
  updatePairTaskStatus,
} from '@/lib/api/tasks';

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
  });
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
