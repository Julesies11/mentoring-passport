import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/context/auth-context';
import { useOrganisation } from '@/providers/organisation-provider';
import { toast } from 'sonner';
import {
  fetchTasks,
  fetchPairTasks,
  fetchPairTaskStats,
  fetchAllPairTaskStatuses,
  updatePairTaskStatus,
  createPairTask,
  updatePairTask,
  deletePairTask,
  createPairSubTask,
  updatePairSubTask,
  deletePairSubTask,
  reorderPairTasks,
  reorderMasterTasks,
  type PairTask,
  type Task,
  type PairSubTask
} from '@/lib/api/tasks';

export function useTasks() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeOrganisation } = useOrganisation();
  const organisationId = activeOrganisation?.id;

  const { data: tasks = [], isLoading, error } = useQuery<Task[]>({
    queryKey: ['tasks', organisationId],
    queryFn: () => typeof organisationId === 'string' ? fetchTasks(organisationId) : Promise.resolve([]),
    enabled: typeof organisationId === 'string',
  });

  const reorderTasksMutation = useMutation({
    mutationFn: (newOrder: { id: string; sort_order: number }[]) => reorderMasterTasks(newOrder),
    onMutate: async (newOrder) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);
      
      if (previousTasks) {
        const orderMap = new Map(newOrder.map(item => [item.id, item.sort_order]));
        
        queryClient.setQueryData<Task[]>(['tasks'], (old) => {
          if (!old) return [];
          return [...old]
            .map(task => ({
              ...task,
              sort_order: orderMap.get(task.id) ?? task.sort_order
            }))
            .sort((a, b) => a.sort_order - b.sort_order);
        });
      }
      
      return { previousTasks };
    },
    onError: (_err, _newOrder, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const pairTasks: PairTask[] = [];
  const isLoadingPairTasks = false;

  return {
    tasks,
    pairTasks,
    isLoading,
    isLoadingPairTasks,
    error,
    fetchPairTasks,
    fetchPairTaskStats,
    updatePairTaskStatus: (taskId: string, status: 'not_submitted' | 'awaiting_review' | 'completed') =>
      updatePairTaskStatus(taskId, status, user?.id),
    reorderTasks: (newOrder: { id: string; sort_order: number }[]) =>
      reorderTasksMutation.mutate(newOrder),
  };
}

export function useAllPairTaskStatuses() {
  return useQuery({
    queryKey: ['pair-tasks', 'all-statuses'],
    queryFn: fetchAllPairTaskStatuses,
  });
}

export function usePairTasks(pairId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

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
    mutationFn: ({ taskId, status, evidenceNotes }: { taskId: string; status: 'not_submitted' | 'awaiting_review' | 'completed' | 'revision_required'; evidenceNotes?: string }) =>
      updatePairTaskStatus(taskId, status, user?.id, evidenceNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pair-tasks', pairId] });
      queryClient.invalidateQueries({ queryKey: ['pair-tasks', pairId, 'stats'] });
    },
  });

  const createPairTaskMutation = useMutation({
    mutationFn: createPairTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pair-tasks', pairId] });
      queryClient.invalidateQueries({ queryKey: ['pair-tasks', pairId, 'stats'] });
    },
  });

  const updatePairTaskMutation = useMutation({
    mutationFn: ({ taskId, updates }: { taskId: string; updates: Partial<PairTask> }) =>
      updatePairTask(taskId, updates),
    onMutate: async ({ taskId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['pair-tasks', pairId] });
      const previousTasks = queryClient.getQueryData<PairTask[]>(['pair-tasks', pairId]);
      
      if (previousTasks) {
        queryClient.setQueryData<PairTask[]>(['pair-tasks', pairId], (old) => {
          const updated = old?.map(task => 
            task.id === taskId ? { ...task, ...updates } : task
          );
          return updated?.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        });
      }
      
      return { previousTasks };
    },
    onError: (_err, _newTodo, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['pair-tasks', pairId], context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pair-tasks', pairId] });
    },
  });

  const deletePairTaskMutation = useMutation({
    mutationFn: deletePairTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pair-tasks', pairId] });
      queryClient.invalidateQueries({ queryKey: ['pair-tasks', pairId, 'stats'] });
      toast.success('Task deleted successfully');
    },
    onError: (error: any) => {
      console.error('Error deleting pair task:', error);
      toast.error('Failed to delete task: ' + (error.message || 'Unknown error'));
    },
  });

  const createPairSubTaskMutation = useMutation({
    mutationFn: createPairSubTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pair-tasks', pairId] });
    },
  });

  const updatePairSubTaskMutation = useMutation({
    mutationFn: ({ subtaskId, updates }: { subtaskId: string; updates: Partial<PairSubTask> }) =>
      updatePairSubTask(subtaskId, updates),
    onMutate: async ({ subtaskId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['pair-tasks', pairId] });
      const previousTasks = queryClient.getQueryData<PairTask[]>(['pair-tasks', pairId]);
      
      if (previousTasks) {
        queryClient.setQueryData<PairTask[]>(['pair-tasks', pairId], (old) => {
          return old?.map(task => ({
            ...task,
            subtasks: task.subtasks?.map(st => 
              st.id === subtaskId ? { ...st, ...updates } : st
            ).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
          }));
        });
      }
      
      return { previousTasks };
    },
    onError: (_err, _newTodo, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['pair-tasks', pairId], context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pair-tasks', pairId] });
    },
  });

  const deletePairSubTaskMutation = useMutation({
    mutationFn: deletePairSubTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pair-tasks', pairId] });
      toast.success('Sub-task deleted successfully');
    },
    onError: (error: any) => {
      console.error('Error deleting pair subtask:', error);
      toast.error('Failed to delete sub-task: ' + (error.message || 'Unknown error'));
    },
  });

  const reorderTasksMutation = useMutation({
    mutationFn: (newOrder: { id: string; sort_order: number }[]) => reorderPairTasks(newOrder),
    onMutate: async (newOrder) => {
      await queryClient.cancelQueries({ queryKey: ['pair-tasks', pairId] });
      const previousTasks = queryClient.getQueryData<PairTask[]>(['pair-tasks', pairId]);
      
      if (previousTasks) {
        // Create a map for quick lookup of new sort orders
        const orderMap = new Map(newOrder.map(item => [item.id, item.sort_order]));
        
        queryClient.setQueryData<PairTask[]>(['pair-tasks', pairId], (old) => {
          if (!old) return [];
          return [...old]
            .map(task => ({
              ...task,
              sort_order: orderMap.get(task.id) ?? task.sort_order
            }))
            .sort((a, b) => a.sort_order - b.sort_order);
        });
      }
      
      return { previousTasks };
    },
    onError: (_err, _newOrder, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['pair-tasks', pairId], context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pair-tasks', pairId] });
    },
  });

  return {
    tasks,
    stats,
    isLoading,
    error,
    updateStatus: (taskId: string, status: 'not_submitted' | 'awaiting_review' | 'completed' | 'revision_required', evidenceNotes?: string) =>
      updateStatusMutation.mutate({ taskId, status, evidenceNotes }),
    createTask: createPairTaskMutation.mutate,
    updateTask: (taskId: string, updates: Partial<PairTask>, options?: any) =>
      updatePairTaskMutation.mutate({ taskId, updates }, options),
    deleteTask: deletePairTaskMutation.mutate,
    createSubTask: createPairSubTaskMutation.mutate,
    updateSubTask: (subtaskId: string, updates: Partial<PairSubTask>, options?: any) =>
      updatePairSubTaskMutation.mutate({ subtaskId, updates }, options),
    deleteSubTask: deletePairSubTaskMutation.mutate,
    reorderTasks: (newOrder: { id: string; sort_order: number }[]) =>
      reorderTasksMutation.mutate(newOrder),
    isUpdating: updateStatusMutation.isPending || updatePairTaskMutation.isPending || updatePairSubTaskMutation.isPending || reorderTasksMutation.isPending,
    isDeleting: deletePairTaskMutation.isPending || deletePairSubTaskMutation.isPending,
    isCreating: createPairTaskMutation.isPending || createPairSubTaskMutation.isPending,
  };
}
