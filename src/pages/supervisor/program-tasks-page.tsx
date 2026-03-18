import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useOrganisation } from '@/providers/organisation-provider';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchEvidenceTypes,
  type ProgramTask,
  type ProgramSubTask
} from '@/lib/api/tasks';
import { useProgramTasks } from '@/hooks/use-tasks';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SearchInput } from '@/components/common/search-input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sortable,
  SortableItem,
  SortableItemHandle,
} from '@/components/ui/sortable';
import { Container } from '@/components/common/container';
import { KeenIcon } from '@/components/keenicons';
import { TaskSetupGrid } from '@/components/tasks/task-setup-grid';
import { ProgramSelector } from '@/components/common/program-selector';

export function SupervisorProgramTasksPage() {
  const { role } = useAuth();
  const { activeProgram, isLoading: isContextLoading } = useOrganisation();
  const queryClient = useQueryClient();
  const programId = activeProgram?.id;

  const [searchTerm, setSearchTerm] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ProgramTask | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [localSubTasks, setLocalSubTasks] = useState<ProgramSubTask[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    evidence_type_id: '',
    is_active: true,
  });
  const [subTaskFormData, setSubTaskFormData] = useState({
    name: '',
    evidence_type_id: '',
    sort_order: 0,
  });

  const { data: evidenceTypes = [] } = useQuery({
    queryKey: ['evidence-types'],
    queryFn: fetchEvidenceTypes,
  });

  const {
    data: tasks = [],
    isLoading: isLoadingTasks,
    error,
    createTask: createProgramTask,
    updateTask: updateProgramTask,
    deleteTask: deleteProgramTask,
    createSubTask: createProgramSubTask,
    updateSubTask: updateProgramSubTask,
    deleteSubTask: deleteProgramSubTask
  } = useProgramTasks(programId);

  useEffect(() => {
    if (tasks.length > 0) {
      setExpandedTasks(new Set(tasks.map((task) => task.id)));
    }
  }, [tasks]);

  const createTaskMutation = useMutation({
    mutationFn: async (data: { task: Omit<ProgramTask, 'id' | 'created_at' | 'updated_at'>, subtasks: any[] }) => {
      if (!programId) throw new Error('Missing Program ID');
      
      const newTask = await new Promise<ProgramTask>((resolve, reject) => {
        createProgramTask(
          { ...data.task, program_id: programId },
          { onSuccess: resolve, onError: reject }
        );
      });
      
      if (data.subtasks && data.subtasks.length > 0) {
        await Promise.all(
          data.subtasks.map((st, index) => 
            new Promise<void>((resolve, reject) => {
              createProgramSubTask({
                program_task_id: newTask.id,
                name: st.name,
                sort_order: index + 1,
                master_subtask_id: null
              }, { onSuccess: () => resolve(), onError: reject });
            })
          )
        );
      }
      return newTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-tasks', programId] });
      setIsEditDialogOpen(false);
      setSelectedTask(null);
      setLocalSubTasks([]);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, updates }: { taskId: string; updates: Partial<ProgramTask>; }) => {
      return new Promise<void>((resolve, reject) => {
        updateProgramTask({ taskId, updates }, { onSuccess: () => resolve(), onError: reject });
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-tasks', programId] });
      setIsEditDialogOpen(false);
      setSelectedTask(null);
      setFormData({ name: '', evidence_type_id: '', is_active: true });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => {
      return new Promise<void>((resolve, reject) => {
        deleteProgramTask(taskId, { onSuccess: () => resolve(), onError: reject });
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-tasks', programId] });
      setIsEditDialogOpen(false);
      setSelectedTask(null);
    },
  });

  const handleDeleteTask = (taskId: string) => {
    if (
      window.confirm(
        'Are you sure you want to delete this task? This will remove all associated subtasks and cannot be undone.',
      )
    ) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  const createSubTaskMutation = useMutation({
    mutationFn: (subtask: Omit<ProgramSubTask, 'id' | 'created_at' | 'updated_at'>) => {
      return new Promise<ProgramSubTask>((resolve, reject) => {
        createProgramSubTask(subtask, { onSuccess: resolve, onError: reject });
      });
    },
    onSuccess: (newSubTask) => {
      queryClient.invalidateQueries({ queryKey: ['program-tasks', programId] });
      setLocalSubTasks((prev) => {
        const updated = [...prev, newSubTask].sort((a, b) => a.sort_order - b.sort_order);
        const fallback = evidenceTypes.find((t: any) => t.name.toLowerCase().includes('not applicable')) || evidenceTypes[0];
        setSubTaskFormData({
          name: '',
          evidence_type_id: fallback?.id || '',
          sort_order: updated.length + 1,
        });
        return updated;
      });
    },
  });

  const deleteSubTaskMutation = useMutation({
    mutationFn: (subtaskId: string) => {
      return new Promise<void>((resolve, reject) => {
        deleteProgramSubTask(subtaskId, { onSuccess: () => resolve(), onError: reject });
      });
    },
    onSuccess: (_, subtaskId) => {
      queryClient.invalidateQueries({ queryKey: ['program-tasks', programId] });
      setLocalSubTasks((prev) => prev.filter((st) => st.id !== subtaskId));
    },
  });

  const updateSubTaskOrderMutation = useMutation({
    mutationFn: async (newOrder: ProgramSubTask[]) => {
      const updates = newOrder.map((st, index) =>
        new Promise<void>((resolve, reject) => {
          updateProgramSubTask({ subtaskId: st.id, updates: { sort_order: index + 1 } }, { onSuccess: () => resolve(), onError: reject });
        })
      );
      return Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-tasks', programId] });
    },
  });

  const updateSubTaskMutation = useMutation({
    mutationFn: ({ subtaskId, updates }: { subtaskId: string; updates: Partial<ProgramSubTask>; }) => {
      return new Promise<void>((resolve, reject) => {
        updateProgramSubTask({ subtaskId, updates }, { onSuccess: () => resolve(), onError: reject });
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-tasks', programId] });
    },
  });

  const reorderTasksMutation = useMutation({
    mutationFn: async (newOrder: ProgramTask[]) => {
      const updates = newOrder.map((st, index) =>
        new Promise<void>((resolve, reject) => {
          updateProgramTask({ taskId: st.id, updates: { sort_order: index + 1 } }, { onSuccess: () => resolve(), onError: reject });
        })
      );
      return Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-tasks', programId] });
    },
  });

  const handleToggleExpand = (taskId: string) => {
    setExpandedTasks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleCreateSubTask = () => {
    if (!subTaskFormData.name.trim()) {
      return;
    }

    if (selectedTask) {
      createSubTaskMutation.mutate({
        program_task_id: selectedTask.id,
        name: subTaskFormData.name,
        sort_order: localSubTasks.length + 1,
        master_subtask_id: null
      });
    } else {
      const newSubTask = {
        id: `temp-${Date.now()}`,
        program_task_id: 'temp',
        name: subTaskFormData.name,
        sort_order: localSubTasks.length + 1,
        master_subtask_id: null
      };
      
      setLocalSubTasks((prev) => [...prev, newSubTask as any]);
      
      const fallback = evidenceTypes.find((t: any) => t.name.toLowerCase().includes('not applicable')) || evidenceTypes[0];
      setSubTaskFormData({
        name: '',
        evidence_type_id: fallback?.id || '',
        sort_order: localSubTasks.length + 2,
      });
    }
  };

  const handleDeleteSubTask = (subtaskId: string) => {
    if (window.confirm('Are you sure you want to delete this subtask?')) {
      if (subtaskId.startsWith('temp-')) {
        setLocalSubTasks((prev) => prev.filter((st) => st.id !== subtaskId));
      } else {
        deleteSubTaskMutation.mutate(subtaskId);
      }
    }
  };

  const handleSubTaskReorder = (newOrder: ProgramSubTask[]) => {
    setLocalSubTasks(newOrder);
    if (selectedTask) {
      updateSubTaskOrderMutation.mutate(newOrder);
    }
  };

  const handleTaskReorder = (newOrder: ProgramTask[]) => {
    reorderTasksMutation.mutate(newOrder);
  };

  const filteredTasks = tasks.filter(
    (task) =>
      task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.evidence_type?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()),
  );

  const handleEditTask = () => {
    if (!formData.name.trim() || !formData.evidence_type_id) {
      return;
    }

    if (selectedTask) {
      updateTaskMutation.mutate({
        taskId: selectedTask.id,
        updates: {
          name: formData.name,
          evidence_type_id: formData.evidence_type_id,
          is_active: formData.is_active,
        },
      });
    } else {
      createTaskMutation.mutate({
        task: {
          name: formData.name,
          evidence_type_id: formData.evidence_type_id,
          sort_order: tasks.length + 1,
          is_active: formData.is_active,
          master_task_id: null,
          program_id: programId!,
        },
        subtasks: localSubTasks
      });
    }
  };

  const openCreateDialog = () => {
    if (!programId) {
      toast.error('Please select a program first');
      return;
    }
    setSelectedTask(null);
    setLocalSubTasks([]);
    const fallback =
      evidenceTypes.find((t: any) =>
        t.name.toLowerCase().includes('not applicable'),
      ) || evidenceTypes[0];
    setFormData({
      name: '',
      evidence_type_id: fallback?.id || '',
      is_active: true,
    });
    setSubTaskFormData({
      name: '',
      evidence_type_id: fallback?.id || '',
      sort_order: 1,
    });
    setIsEditDialogOpen(true);
  };

  const openEditDialog = (task: ProgramTask) => {
    setSelectedTask(task);
    setLocalSubTasks(task.subtasks || []);
    setFormData({
      name: task.name,
      evidence_type_id: task.evidence_type_id || '',
      is_active: task.is_active,
    });
    const fallback =
      evidenceTypes.find((t: any) =>
        t.name.toLowerCase().includes('not applicable'),
      ) || evidenceTypes[0];
    setSubTaskFormData({
      name: '',
      evidence_type_id: fallback?.id || '',
      sort_order: (task.subtasks?.length || 0) + 1,
    });
    setIsEditDialogOpen(true);
  };

  if (isContextLoading) {
    return (
      <Container>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
          <KeenIcon icon="loading" className="animate-spin text-3xl mb-4" />
          <p className="font-bold uppercase text-[10px] tracking-widest">Loading program data...</p>
        </div>
      </Container>
    );
  }

  const isAdmin = role === 'administrator' || role === 'org-admin';
  if (role !== 'supervisor' && !isAdmin) {
    return (
      <Container>
        <div className="flex flex-col items-center justify-center py-16">
          <KeenIcon icon="shield-slash" className="text-3xl text-danger mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h3>
        </div>
      </Container>
    );
  }

  return (
    <>
      <div className="hidden sm:block">
        <Container>
          <Toolbar>
            <div className="flex items-center gap-5">
              <ToolbarHeading
                title="Program Tasks"
                description="Manage task templates for the selected mentoring program"
              />
              <ProgramSelector />
            </div>
          </Toolbar>
        </Container>
      </div>

      <Container className="sm:mt-0">
        <div className="grid gap-5 lg:gap-7.5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50 p-2 sm:p-3 rounded-xl border border-gray-200">
            <div className="flex-1 w-full md:max-w-[400px]">
              <SearchInput
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClear={() => setSearchTerm('')}
                className="h-9 bg-white text-xs"
              />
            </div>

            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground bg-white px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm shrink-0 uppercase tracking-widest">
              <span>
                Showing {filteredTasks.length} of {tasks.length} tasks
              </span>
            </div>
          </div>

          <div className="border-0 sm:border sm:rounded-xl sm:bg-card sm:shadow-sm min-w-0 w-full">
            <CardHeader className="hidden sm:flex flex-row items-center justify-end py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={openCreateDialog}
                disabled={!programId}
              >
                <KeenIcon icon="plus" />
                Add Task
              </Button>
            </CardHeader>
            <div className="p-0 min-w-0 w-full">
              {isLoadingTasks ? (
                <div className="text-center py-12 text-muted-foreground">
                  <KeenIcon icon="loading" className="animate-spin mb-2 text-2xl" />
                  <p>Loading tasks...</p>
                </div>
              ) : !programId ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Select a program to get started</p>
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <div className="size-20 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4 text-gray-200">
                    <KeenIcon icon="clipboard" className="text-5xl" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">No Tasks Found</h3>
                  <p className="max-w-xs mx-auto mb-8 text-sm">
                    This program doesn't have any tasks assigned yet. You can create your own tasks or use the template library.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={openCreateDialog}
                  >
                    <KeenIcon icon="plus" />
                    Create First Task
                  </Button>
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <KeenIcon icon="search" className="text-4xl mb-2 opacity-20" />
                  <p>No tasks match "{searchTerm}"</p>
                  <Button 
                    variant="link" 
                    size="sm" 
                    onClick={() => setSearchTerm('')}
                    className="mt-2"
                  >
                    Clear search
                  </Button>
                </div>
              ) : (
                <TaskSetupGrid
                  tasks={filteredTasks}
                  expandedTasks={expandedTasks}
                  onToggleExpand={handleToggleExpand}
                  onEdit={openEditDialog}
                  onDelete={handleDeleteTask}
                  onReorder={handleTaskReorder}
                  isDeleting={deleteTaskMutation.isPending}
                />
              )}
            </div>
            <div className="sm:hidden fixed bottom-20 right-4 z-50">
              <Button
                size="lg"
                className="rounded-full shadow-lg h-14 w-14 p-0 flex items-center justify-center bg-primary text-white"
                onClick={openCreateDialog}
                disabled={!programId}
              >
                <KeenIcon icon="plus" className="text-2xl" />
              </Button>
            </div>
          </div>
        </div>
      </Container>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent 
          className="max-w-[600px] h-[85dvh] w-[calc(100%-32px)] sm:w-full p-0 overflow-hidden flex flex-col border-none shadow-2xl rounded-2xl"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="p-4 sm:px-6 sm:py-5 border-b border-gray-100 flex-shrink-0">
            <DialogTitle className="text-lg sm:text-xl font-bold text-gray-900">
              {selectedTask ? 'Edit Task & Subtasks' : 'Add New Task'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 sm:px-6 sm:py-6 space-y-6">
            <div className="space-y-4">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-task-name" className="text-xs font-bold text-gray-600 uppercase">Task Name</Label>
                <Input
                  id="edit-task-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter task name..."
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="edit-evidence-type" className="text-xs font-bold text-gray-600 uppercase">Evidence Requirement</Label>
                <Select
                  value={formData.evidence_type_id}
                  onValueChange={(value) => setFormData({ ...formData, evidence_type_id: value })}
                >
                  <SelectTrigger className="h-10 border-gray-200 rounded-xl">
                    <SelectValue placeholder="Select requirement" />
                  </SelectTrigger>
                  <SelectContent>
                    {evidenceTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name} {type.requires_submission && '(Required)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-50">
              <h4 className="font-bold text-gray-800 text-xs sm:text-sm uppercase tracking-wider">Subtasks ({localSubTasks.length})</h4>
              <div className="relative">
                <Input
                  placeholder="New subtask..."
                  value={subTaskFormData.name}
                  onChange={(e) => setSubTaskFormData({ ...subTaskFormData, name: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreateSubTask())}
                />
                <Button
                  size="sm"
                  className="absolute right-1 top-1 size-8"
                  onClick={handleCreateSubTask}
                  disabled={createSubTaskMutation.isPending || !subTaskFormData.name.trim()}
                >
                  <KeenIcon icon="plus" />
                </Button>
              </div>

              <div className="space-y-2">
                <Sortable value={localSubTasks} onValueChange={handleSubTaskReorder} getItemValue={(item) => item.id}>
                  {localSubTasks.map((subtask) => (
                    <SortableItem key={subtask.id} value={subtask.id}>
                      <div className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl group relative">
                        <SortableItemHandle>
                          <KeenIcon icon="dots-square-vertical" className="text-gray-400 cursor-grab" />
                        </SortableItemHandle>
                        <Input
                          defaultValue={subtask.name}
                          onBlur={(e) => {
                            if (subtask.id.startsWith('temp-')) {
                              setLocalSubTasks(prev => prev.map(st => st.id === subtask.id ? { ...st, name: e.target.value } : st));
                            } else {
                              updateSubTaskMutation.mutate({ subtaskId: subtask.id, updates: { name: e.target.value } });
                            }
                          }}
                          className="border-none shadow-none bg-transparent"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-danger"
                          onClick={() => handleDeleteSubTask(subtask.id)}
                        >
                          <KeenIcon icon="trash" />
                        </Button>
                      </div>
                    </SortableItem>
                  ))}
                </Sortable>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 sm:px-6 sm:py-5 border-t border-gray-100 bg-gray-50/30">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditTask} disabled={updateTaskMutation.isPending || createTaskMutation.isPending || !formData.name.trim()}>
              {selectedTask ? 'Save Changes' : 'Create Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
