import React, { useCallback, useMemo } from 'react';
import { TASK_STATUS, TaskStatus } from '@/config/constants';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/context/auth-context';
import { toast } from 'sonner';
import { NotificationService } from '@/lib/api/notifications-service';
import {
  fetchTasks,
  fetchPairTasks,
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
  createProgramTask,
  updateProgramTask,
  deleteProgramTask,
  createProgramSubTask,
  updateProgramSubTask,
  deleteProgramSubTask,
  type PairTask,
  type Task,
  type PairSubTask,
  type ProgramTask,
  type ProgramSubTask
} from '@/lib/api/tasks';

const EMPTY_ARRAY: any[] = [];

export function useTasks() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: tasks = EMPTY_ARRAY, isLoading, error } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: () => fetchTasks(),
    enabled: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
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

  const updatePairTaskStatusCallback = useCallback((taskId: string, status: TaskStatus) =>
    updatePairTaskStatus(taskId, status, user?.id), [user?.id]);

  const reorderTasksCallback = useCallback((newOrder: { id: string; sort_order: number }[]) =>
    reorderTasksMutation.mutate(newOrder), [reorderTasksMutation]);

  return {
    tasks,
    isLoading,
    error,
    fetchPairTasks,
    updatePairTaskStatus: updatePairTaskStatusCallback,
    reorderTasks: reorderTasksCallback,
  };
}

export function useTaskLists() {
  return useQuery({
    queryKey: ['task-lists'],
    queryFn: () => fetchTaskLists(),
    enabled: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useTaskListTasks(taskListId?: string) {
  return useQuery({
    queryKey: ['task-list-tasks', taskListId],
    queryFn: () => fetchTaskListTasks(taskListId!),
    enabled: !!taskListId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useProgramTasks(programId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['program-tasks', programId],
    queryFn: () => fetchProgramTasks(programId!),
    enabled: !!programId,
    staleTime: 1000 * 60 * 5, // 5 minutes
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

  const createTaskCallback = useCallback(createTaskMutation.mutate, [createTaskMutation]);
  const updateTaskCallback = useCallback(({ taskId, updates }: { taskId: string; updates: Partial<ProgramTask> }) =>
    updateTaskMutation.mutate({ taskId, updates }), [updateTaskMutation]);
  const deleteTaskCallback = useCallback(deleteTaskMutation.mutate, [deleteTaskMutation]);
  const createSubTaskCallback = useCallback(createSubTaskMutation.mutate, [createSubTaskMutation]);
  const updateSubTaskCallback = useCallback(({ subtaskId, updates }: { subtaskId: string; updates: Partial<ProgramSubTask> }) =>
    updateSubTaskMutation.mutate({ subtaskId, updates }), [updateSubTaskMutation]);
  const deleteSubTaskCallback = useCallback(deleteSubTaskMutation.mutate, [deleteSubTaskMutation]);

  return {
    ...query,
    createTask: createTaskCallback,
    updateTask: updateTaskCallback,
    deleteTask: deleteTaskCallback,
    createSubTask: createSubTaskCallback,
    updateSubTask: updateSubTaskCallback,
    deleteSubTask: deleteSubTaskCallback,
  };
}

export function useAllPairTaskStatuses(programId?: string) {
  return useQuery({
    queryKey: ['pair-tasks', 'all-statuses', programId],
    queryFn: () => fetchAllPairTaskStatuses(programId),
    staleTime: 1000 * 60 * 5, // 5 minutes
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

  const stats = useMemo(() => {
    const total = tasks.length;
    const completedCount = tasks.filter(t => t.status === TASK_STATUS.COMPLETED).length;
    return {
      total,
      not_submitted: tasks.filter(t => t.status === TASK_STATUS.NOT_SUBMITTED).length,
      awaiting_review: tasks.filter(t => t.status === TASK_STATUS.AWAITING_REVIEW).length,
      completed: completedCount,
      completion_percentage: total > 0 ? Math.round((completedCount / total) * 100) : 0,
    };
  }, [tasks]);

  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, status, evidenceNotes }: { taskId: string; status: TaskStatus; evidenceNotes?: string }) =>
      updatePairTaskStatus(taskId, status, user?.id, evidenceNotes),
    onSuccess: async (updatedTask) => {
      await queryClient.invalidateQueries({ queryKey: ['pair-tasks', pairId] });

      const currentTask = tasks.find(t => t.id === updatedTask.id);
      const mentorId = currentTask?.pair?.mentor_id;
      const menteeId = currentTask?.pair?.mentee_id;
      const mentorName = currentTask?.pair?.mentor?.full_name || 'Mentor';
      const menteeName = currentTask?.pair?.mentee?.full_name || 'Mentee';

      if (updatedTask.status === TASK_STATUS.AWAITING_REVIEW && user?.id && mentorId && menteeId) {
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

      const actorName = user.full_name || user.email || 'Participant';
      if (stats.completed === stats.total) {
        await NotificationService.notifyMilestone('pair_completed', pairId, mentorName, menteeName, user.id, actorName);
      } else if (stats.completed >= stats.total / 2 && (stats.completed - 1) < stats.total / 2) {
        await NotificationService.notifyMilestone('milestone_50', pairId, mentorName, menteeName, user.id, actorName);
      }
    },
  });

  const createPairTaskMutation = useMutation({
    mutationFn: createPairTask,
    onSuccess: async (newTask) => {
      queryClient.invalidateQueries({ queryKey: ['pair-tasks', pairId] });
      
      const currentTasks = tasks;
      const hasStarted = currentTasks.some(t => t.status !== TASK_STATUS.NOT_SUBMITTED);
      
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
          return updated;
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

  const updateStatusCallback = useCallback((taskId: string, status: TaskStatus, evidenceNotes?: string) =>
    updateStatusMutation.mutate({ taskId, status, evidenceNotes }), [updateStatusMutation]);

  const createTaskCallback = useCallback(createPairTaskMutation.mutate, [createPairTaskMutation]);

  const updateTaskCallback = useCallback((taskId: string, updates: Partial<PairTask>, options?: any) =>
    updatePairTaskMutation.mutate({ taskId, updates }, options), [updatePairTaskMutation]);

  const deleteTaskCallback = useCallback(deletePairTaskMutation.mutate, [deletePairTaskMutation]);

  const createSubTaskCallback = useCallback(createPairSubTaskMutation.mutate, [createPairSubTaskMutation]);

  const updateSubTaskCallback = useCallback((subtaskId: string, updates: Partial<PairSubTask>, options?: any) =>
    updatePairSubTaskMutation.mutate({ subtaskId, updates }, options), [updatePairSubTaskMutation]);

  const deleteSubTaskCallback = useCallback(deletePairSubTaskMutation.mutate, [deletePairSubTaskMutation]);

  const reorderTasksCallback = useCallback((newOrder: { id: string; sort_order: number }[]) =>
    reorderTasksMutation.mutate(newOrder), [reorderTasksMutation]);

  return {
    tasks,
    stats,
    isLoading,
    error,
    updateStatus: updateStatusCallback,
    createTask: createTaskCallback,
    updateTask: updateTaskCallback,
    deleteTask: deleteTaskCallback,
    createSubTask: createSubTaskCallback,
    updateSubTask: updateSubTaskCallback,
    deleteSubTask: deleteSubTaskCallback,
    reorderTasks: reorderTasksCallback,
    isUpdating: updateStatusMutation.isPending || updatePairTaskMutation.isPending || updatePairSubTaskMutation.isPending || reorderTasksMutation.isPending,
    isDeleting: deletePairTaskMutation.isPending || deletePairSubTaskMutation.isPending,
    isCreating: createPairTaskMutation.isPending || createPairSubTaskMutation.isPending,
  };
}
