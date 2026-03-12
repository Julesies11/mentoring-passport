import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/context/auth-context';
import { useOrganisation } from '@/providers/organisation-provider';
import { toast } from 'sonner';
import { NotificationService } from '@/lib/api/notifications-service';
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
  togglePairSubTaskCompletion,
  fetchTaskLists,
  fetchTaskListTasks,
  fetchProgramTasks,
  createTaskList,
  createProgramTask,
  updateProgramTask,
  deleteProgramTask,
  createProgramSubTask,
  updateProgramSubTask,
  deleteProgramSubTask,
  type PairTask,
  type Task,
  type PairSubTask,
  type TaskListMaster,
  type ProgramTask,
  type ProgramSubTask
} from '@/lib/api/tasks';

export function useTasks() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeOrganisation } = useOrganisation();
  
  const orgId = activeOrganisation?.id;

  const { data: tasks = [], isLoading, error } = useQuery<Task[]>({
    queryKey: ['tasks', orgId],
    queryFn: () => fetchTasks(orgId),
    enabled: !!(orgId || user?.role === 'administrator'),
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

  return {
    tasks,
    isLoading,
    error,
    fetchPairTasks,
    fetchPairTaskStats,
    updatePairTaskStatus: (taskId: string, status: 'not_submitted' | 'awaiting_review' | 'completed') =>
      updatePairTaskStatus(taskId, status, user?.id),
    reorderTasks: (newOrder: { id: string; sort_order: number }[]) =>
      reorderTasksMutation.mutate(newOrder),
  };
}

export function useTaskLists(organisationId?: string) {
  const { user } = useAuth();
  const { activeOrganisation } = useOrganisation();
  const orgId = organisationId || activeOrganisation?.id;

  return useQuery({
    queryKey: ['task-lists', orgId],
    queryFn: () => fetchTaskLists(orgId!),
    enabled: !!orgId,
  });
}

export function useTaskListTasks(taskListId?: string) {
  return useQuery({
    queryKey: ['task-list-tasks', taskListId],
    queryFn: () => fetchTaskListTasks(taskListId!),
    enabled: !!taskListId,
  });
}

export function useProgramTasks(programId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['program-tasks', programId],
    queryFn: () => fetchProgramTasks(programId!),
    enabled: !!programId,
  });

  const createTaskMutation = useMutation({
    mutationFn: createProgramTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-tasks', programId] });
      toast.success('Program task created');
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, updates }: { taskId: string; updates: Partial<ProgramTask> }) =>
      updateProgramTask(taskId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-tasks', programId] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: deleteProgramTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-tasks', programId] });
      toast.success('Program task deleted');
    },
  });

  const createSubTaskMutation = useMutation({
    mutationFn: createProgramSubTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-tasks', programId] });
    },
  });

  const updateSubTaskMutation = useMutation({
    mutationFn: ({ subtaskId, updates }: { subtaskId: string; updates: Partial<ProgramSubTask> }) =>
      updateProgramSubTask(subtaskId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-tasks', programId] });
    },
  });

  const deleteSubTaskMutation = useMutation({
    mutationFn: deleteProgramSubTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-tasks', programId] });
    },
  });

  return {
    ...query,
    createTask: createTaskMutation.mutate,
    updateTask: updateTaskMutation.mutate,
    deleteTask: deleteTaskMutation.mutate,
    createSubTask: createSubTaskMutation.mutate,
    updateSubTask: updateSubTaskMutation.mutate,
    deleteSubTask: deleteSubTaskMutation.mutate,
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
    onSuccess: async (updatedTask) => {
      // Refresh cache
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pair-tasks', pairId] }),
        queryClient.invalidateQueries({ queryKey: ['pair-tasks', pairId, 'stats'] })
      ]);

      // Get pair info from our current list
      const currentTask = tasks.find(t => t.id === updatedTask.id);
      const mentorId = currentTask?.pair?.mentor_id;
      const menteeId = currentTask?.pair?.mentee_id;
      const mentorName = currentTask?.pair?.mentor?.full_name || 'Mentor';
      const menteeName = currentTask?.pair?.mentee?.full_name || 'Mentee';

      // 1. Handle Task Submission (Notify Supervisors AND Partner)
      if (updatedTask.status === 'awaiting_review' && user?.id && mentorId && menteeId) {
        const actorName = user.full_name || user.email || 'Participant';
        await NotificationService.notifyTaskSubmitted(
          updatedTask.name, 
          pairId, 
          mentorId, 
          menteeId, 
          mentorName, 
          menteeName, 
          user.id,
          actorName
        );
      }

      // 2. Check for Milestones (50% / 100%)
      const freshStats = await fetchPairTaskStats(pairId);
      const actorName = user.full_name || user.email || 'Participant';
      if (freshStats.completed === freshStats.total) {
        await NotificationService.notifyMilestone('pair_completed', pairId, mentorName, menteeName, user.id, actorName);
      } else if (freshStats.completed >= freshStats.total / 2 && (freshStats.completed - 1) < freshStats.total / 2) {
        await NotificationService.notifyMilestone('milestone_50', pairId, mentorName, menteeName, user.id, actorName);
      }
    },
  });

  const createPairTaskMutation = useMutation({
    mutationFn: createPairTask,
    onSuccess: async (newTask) => {
      queryClient.invalidateQueries({ queryKey: ['pair-tasks', pairId] });
      queryClient.invalidateQueries({ queryKey: ['pair-tasks', pairId, 'stats'] });
      
      // Notify pair about the new task if pair is already active
      const currentTasks = tasks;
      const hasStarted = currentTasks.some(t => t.status !== 'not_submitted');
      
      if (hasStarted) {
        const firstTask = currentTasks[0];
        const mentorId = firstTask?.pair?.mentor_id;
        const menteeId = firstTask?.pair?.mentee_id;
        if (mentorId && menteeId && user?.id) {
          await NotificationService.notifyTaskAdded(newTask.id, newTask.name, mentorId, menteeId, user.id);
        }
      }
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
          return updated; // Sorting is handled by the server and initial fetch
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
    mutationFn: ({ subtaskId, updates }: { subtaskId: string; updates: Partial<PairSubTask> }) => {
      if (Object.keys(updates).length === 1 && 'is_completed' in updates) {
        return togglePairSubTaskCompletion(subtaskId, updates.is_completed!, user?.id);
      }
      return updatePairSubTask(subtaskId, updates);
    },
    onMutate: async ({ subtaskId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['pair-tasks', pairId] });
      const previousTasks = queryClient.getQueryData<PairTask[]>(['pair-tasks', pairId]);
      
      if (previousTasks) {
        queryClient.setQueryData<PairTask[]>(['pair-tasks', pairId], (old) => {
          return old?.map(task => {
            if (!task.subtasks?.some(st => st.id === subtaskId)) return task;
            
            return {
              ...task,
              subtasks: task.subtasks.map(st => 
                st.id === subtaskId ? { ...st, ...updates } : st
              )
            };
          });
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
