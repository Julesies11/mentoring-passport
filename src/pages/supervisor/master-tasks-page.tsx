import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createMasterSubTask,
  createTask,
  deleteMasterSubTask,
  deleteTask,
  fetchEvidenceTypes,
  fetchTasks,
  reorderMasterTasks,
  updateMasterSubTask,
  updateTask,
  type MasterSubTask,
  type Task,
} from '@/lib/api/tasks';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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

export function SupervisorMasterTasksPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [localSubTasks, setLocalSubTasks] = useState<MasterSubTask[]>([]);
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

  // Fetch evidence types
  const { data: evidenceTypes = [] } = useQuery({
    queryKey: ['evidence-types'],
    queryFn: fetchEvidenceTypes,
  });

  // Fetch master tasks
  const {
    data: tasks = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['master-tasks'],
    queryFn: () => fetchTasks(true),
    enabled: user?.role === 'supervisor',
  });

  // Automatically expand all tasks by default
  useEffect(() => {
    if (tasks.length > 0) {
      setExpandedTasks(new Set(tasks.map((task) => task.id)));
    }
  }, [tasks]);

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-tasks'] });
      setIsEditDialogOpen(false);
      setSelectedTask(null);
      toast.success('Task created successfully');
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({
      taskId,
      updates,
    }: {
      taskId: string;
      updates: Partial<Task>;
    }) => updateTask(taskId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-tasks'] });
      setIsEditDialogOpen(false);
      setSelectedTask(null);
      setFormData({ name: '', evidence_type_id: '', is_active: true });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-tasks'] });
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

  // Create subtask mutation
  const createSubTaskMutation = useMutation({
    mutationFn: (
      subtask: Omit<MasterSubTask, 'id' | 'created_at' | 'updated_at'>,
    ) => createMasterSubTask(subtask),
    onSuccess: (newSubTask) => {
      queryClient.invalidateQueries({ queryKey: ['master-tasks'] });
      setLocalSubTasks((prev) => {
        const updated = [...prev, newSubTask].sort(
          (a, b) => a.sort_order - b.sort_order,
        );
        const fallback =
          evidenceTypes.find((t: any) =>
            t.name.toLowerCase().includes('not applicable'),
          ) || evidenceTypes[0];
        setSubTaskFormData({
          name: '',
          evidence_type_id: fallback?.id || '',
          sort_order: updated.length + 1,
        });
        return updated;
      });
    },
  });

  // Delete subtask mutation
  const deleteSubTaskMutation = useMutation({
    mutationFn: (subtaskId: string) => deleteMasterSubTask(subtaskId),
    onSuccess: (_, subtaskId) => {
      queryClient.invalidateQueries({ queryKey: ['master-tasks'] });
      setLocalSubTasks((prev) => prev.filter((st) => st.id !== subtaskId));
    },
  });

  // Update subtask order mutation
  const updateSubTaskOrderMutation = useMutation({
    mutationFn: async (newOrder: MasterSubTask[]) => {
      const updates = newOrder.map((st, index) =>
        updateMasterSubTask(st.id, { sort_order: index + 1 }),
      );
      return Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-tasks'] });
    },
  });

  // Individual subtask update mutation
  const updateSubTaskMutation = useMutation({
    mutationFn: ({
      subtaskId,
      updates,
    }: {
      subtaskId: string;
      updates: Partial<MasterSubTask>;
    }) => updateMasterSubTask(subtaskId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-tasks'] });
    },
  });

  const reorderTasksMutation = useMutation({
    mutationFn: reorderMasterTasks,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-tasks'] });
    },
  });

  // Subtask handlers
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
    if (!subTaskFormData.name.trim() || !selectedTask) {
      return;
    }

    createSubTaskMutation.mutate({
      task_id: selectedTask.id,
      name: subTaskFormData.name,
      evidence_type_id:
        subTaskFormData.evidence_type_id || evidenceTypes[0]?.id,
      sort_order: localSubTasks.length + 1,
    });
  };

  const handleDeleteSubTask = (subtaskId: string) => {
    if (window.confirm('Are you sure you want to delete this subtask?')) {
      deleteSubTaskMutation.mutate(subtaskId);
    }
  };

  const handleSubTaskReorder = (newOrder: MasterSubTask[]) => {
    setLocalSubTasks(newOrder);
    updateSubTaskOrderMutation.mutate(newOrder);
  };

  const handleTaskReorder = (newOrder: Task[]) => {
    const updates = newOrder.map((task, index) => ({
      id: task.id,
      sort_order: index + 1,
    }));
    reorderTasksMutation.mutate(updates);
  };

  // Filter tasks based on search
  const filteredTasks = tasks.filter(
    (task) =>
      task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.evidence_type?.name.toLowerCase().includes(searchTerm.toLowerCase()),
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
        name: formData.name,
        evidence_type_id: formData.evidence_type_id,
        sort_order: tasks.length + 1,
        is_active: formData.is_active,
      });
    }
  };

  const openCreateDialog = () => {
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

  const openEditDialog = (task: Task) => {
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

  if (user?.role !== 'supervisor') {
    return (
      <>
        <Container>
          <Toolbar>
            <ToolbarHeading
              title="Master Task List"
              description="Access restricted"
            />
          </Toolbar>
        </Container>
        <Container>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="size-20 rounded-full bg-danger-light flex items-center justify-center mb-4">
                <KeenIcon
                  icon="shield-slash"
                  className="text-3xl text-danger"
                />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Access Denied
              </h3>
              <p className="text-muted-foreground text-center max-w-sm">
                You don't have permission to access the Master Task List. Only
                supervisors can manage program-wide tasks.
              </p>
            </CardContent>
          </Card>
        </Container>
      </>
    );
  }

  return (
    <>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Master Task List"
            description="Manage the master list of tasks available for all mentoring pairs"
          />
        </Toolbar>
      </Container>

      <Container>
        <div className="grid gap-5 lg:gap-7.5">
          <Card>
            <CardContent className="p-5">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Search */}
                <div className="flex-1">
                  <SearchInput
                    placeholder="Search tasks by name or evidence type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onClear={() => setSearchTerm('')}
                  />
                </div>

                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                  <KeenIcon icon="filter" className="text-gray-400" />
                  <span>
                    Showing {filteredTasks.length} of {tasks.length} tasks
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-end py-4">
              <Button
                size="sm"
                onClick={openCreateDialog}
              >
                <KeenIcon icon="plus" />
                Add Task
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  <KeenIcon
                    icon="loading"
                    className="animate-spin mb-2 text-2xl"
                  />
                  <p>Loading tasks...</p>
                </div>
              ) : error ? (
                <div className="text-center py-12 text-danger">
                  <KeenIcon
                    icon="cloud-cross"
                    className="text-4xl mb-2 opacity-20"
                  />
                  <p>Error loading tasks. Please try again.</p>
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <KeenIcon
                    icon="document"
                    className="text-4xl mb-2 opacity-20"
                  />
                  <p>
                    {searchTerm
                      ? 'No tasks found matching your search'
                      : 'Get started by adding your first task'}
                  </p>
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
            </CardContent>
          </Card>
        </div>
      </Container>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[600px] h-[85vh] p-0 overflow-hidden flex flex-col border-none shadow-2xl">
          <DialogHeader className="px-6 py-5 border-b border-gray-100 flex-shrink-0">
            <DialogTitle className="text-xl font-bold text-gray-900">
              Edit Task & Subtasks
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Refine the task details and manage sequential subtasks.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto kt-scrollable-y-hover px-6 py-6 space-y-8">
            {/* Main Task Info Section */}
            <div className="space-y-5">
              <div className="grid gap-5">
                <div className="grid gap-2">
                  <Label
                    htmlFor="edit-task-name"
                    className="text-xs font-bold text-gray-600 uppercase"
                  >
                    Task Name
                  </Label>
                  <Input
                    id="edit-task-name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="h-11 border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary/20"
                    placeholder="Enter task name..."
                  />
                </div>

                <div className="grid gap-2">
                  <Label
                    htmlFor="edit-evidence-type"
                    className="text-xs font-bold text-gray-600 uppercase"
                  >
                    Evidence Requirement *
                  </Label>
                  <Select
                    value={formData.evidence_type_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, evidence_type_id: value })
                    }
                  >
                    <SelectTrigger className="h-11 border-gray-200">
                      <SelectValue placeholder="Select requirement (Required)" />
                    </SelectTrigger>
                    <SelectContent>
                      {evidenceTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          <div className="flex items-center justify-between w-full gap-4">
                            <span
                              className={cn(
                                type.requires_submission &&
                                  'font-semibold text-gray-900',
                              )}
                            >
                              {type.name}
                            </span>
                            {type.requires_submission && (
                              <Badge
                                variant="destructive"
                                appearance="light"
                                size="xs"
                                className="gap-1 px-1.5"
                              >
                                <KeenIcon
                                  icon="cloud-upload"
                                  className="text-[9px]"
                                />
                                Required
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Subtasks Section */}
            {selectedTask ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-1 border-b border-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <KeenIcon icon="list" className="text-primary text-base" />
                    </div>
                    <h4 className="font-bold text-gray-800 text-sm uppercase tracking-wider">
                      Subtasks ({localSubTasks.length})
                    </h4>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium bg-gray-100 px-2 py-0.5 rounded-full uppercase">
                    Drag to reorder
                  </p>
                </div>

                <div className="relative group">
                  <Input
                    placeholder="Type a new subtask and press enter..."
                    value={subTaskFormData.name}
                    onChange={(e) =>
                      setSubTaskFormData({
                        ...subTaskFormData,
                        name: e.target.value,
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateSubTask();
                      }
                    }}
                    className="h-12 pl-4 pr-12 border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary/20 shadow-sm rounded-xl"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute right-1.5 top-1.5 size-9 p-0 hover:bg-primary hover:text-white rounded-lg transition-all"
                    onClick={handleCreateSubTask}
                    disabled={
                      createSubTaskMutation.isPending ||
                      !subTaskFormData.name.trim()
                    }
                  >
                    {createSubTaskMutation.isPending ? (
                      <KeenIcon icon="loading" className="animate-spin" />
                    ) : (
                      <KeenIcon icon="plus" className="text-lg" />
                    )}
                  </Button>
                </div>

                <div className="min-h-[100px]">
                  {localSubTasks.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
                      <KeenIcon
                        icon="file-added"
                        className="text-3xl text-gray-200 mb-2"
                      />
                      <p className="text-sm text-muted-foreground italic">
                        No subtasks defined yet
                      </p>
                    </div>
                  ) : (
                    <Sortable
                      value={localSubTasks}
                      onValueChange={handleSubTaskReorder}
                      getItemValue={(item) => item.id}
                      className="space-y-3"
                    >
                      {localSubTasks.map((subtask) => (
                        <SortableItem key={subtask.id} value={subtask.id}>
                          <div className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl hover:border-primary/40 hover:shadow-md transition-all group relative overflow-hidden">
                            <SortableItemHandle>
                              <div className="flex items-center justify-center size-8 rounded-lg bg-gray-50 group-hover:bg-primary/5 transition-colors cursor-grab active:cursor-grabbing">
                                <KeenIcon
                                  icon="dots-square-vertical"
                                  className="text-gray-400 group-hover:text-primary"
                                />
                              </div>
                            </SortableItemHandle>

                            <div className="flex-1 flex flex-col min-w-0 pr-10">
                              <Input
                                defaultValue={subtask.name}
                                onBlur={(e) => {
                                  if (
                                    e.target.value !== subtask.name &&
                                    e.target.value.trim()
                                  ) {
                                    updateSubTaskMutation.mutate({
                                      subtaskId: subtask.id,
                                      updates: { name: e.target.value.trim() },
                                    });
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    (e.target as HTMLInputElement).blur();
                                  }
                                }}
                                className="border-none focus:ring-0 focus:border-none shadow-none px-0 h-auto text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors bg-transparent"
                              />

                              <div className="flex items-center gap-2 mt-1">
                                <Select
                                  defaultValue={subtask.evidence_type_id || ''}
                                  onValueChange={(value) => {
                                    if (
                                      value !== (subtask.evidence_type_id || '')
                                    ) {
                                      const fallback =
                                        evidenceTypes.find((t: any) =>
                                          t.name
                                            .toLowerCase()
                                            .includes('not applicable'),
                                        ) || evidenceTypes[0];
                                      updateSubTaskMutation.mutate({
                                        subtaskId: subtask.id,
                                        updates: {
                                          evidence_type_id: value || fallback?.id,
                                        },
                                      });
                                    }
                                  }}
                                >
                                  <SelectTrigger className="h-6 border-none bg-gray-100 hover:bg-gray-200 text-[10px] font-bold text-muted-foreground uppercase tracking-tight py-0 px-2 rounded-md shadow-none w-auto gap-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {evidenceTypes.map((type) => (
                                      <SelectItem
                                        key={type.id}
                                        value={type.id}
                                        className="text-xs"
                                      >
                                        <div className="flex items-center justify-between w-full gap-4">
                                          <span
                                            className={cn(
                                              type.requires_submission &&
                                                'font-semibold text-gray-900',
                                            )}
                                          >
                                            {type.name}
                                          </span>
                                          {type.requires_submission && (
                                            <Badge
                                              variant="destructive"
                                              appearance="light"
                                              size="xs"
                                              className="gap-1 px-1.5"
                                            >
                                              <KeenIcon
                                                icon="cloud-upload"
                                                className="text-[9px]"
                                              />
                                              Required
                                            </Badge>
                                          )}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                mode="icon"
                                className="size-9 text-gray-300 hover:text-danger hover:bg-danger/5 opacity-0 group-hover:opacity-100 transition-all rounded-xl"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSubTask(subtask.id);
                                }}
                                disabled={
                                  deleteSubTaskMutation.isPending ||
                                  updateSubTaskMutation.isPending
                                }
                              >
                                <KeenIcon icon="trash" className="text-lg" />
                              </Button>
                            </div>
                          </div>
                        </SortableItem>
                      ))}
                    </Sortable>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-8 p-6 text-center border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                <KeenIcon icon="information-2" className="text-3xl text-gray-300 mb-3" />
                <h4 className="text-sm font-bold text-gray-700 mb-1">Save Task to Add Subtasks</h4>
                <p className="text-xs text-gray-500 max-w-[250px] mx-auto">
                  You can define a sequence of subtasks after saving the main task details.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className={cn(
            "px-6 py-5 border-t border-gray-100 flex-shrink-0 bg-gray-50/30",
            selectedTask ? "justify-between" : "justify-end"
          )}>
            {selectedTask && (
              <Button
                variant="destructive"
                className="h-11 px-6 rounded-xl font-bold"
                onClick={() => handleDeleteTask(selectedTask.id)}
                disabled={deleteTaskMutation.isPending}
              >
                <KeenIcon icon="trash" />
                Delete Task
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-11 px-6 rounded-xl font-bold"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={updateTaskMutation.isPending || createTaskMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                className="h-11 px-8 rounded-xl font-bold shadow-lg shadow-primary/20"
                onClick={handleEditTask}
                disabled={
                  updateTaskMutation.isPending ||
                  createTaskMutation.isPending ||
                  !formData.name.trim() ||
                  !formData.evidence_type_id
                }
              >
                {updateTaskMutation.isPending || createTaskMutation.isPending ? (
                  <>
                    <KeenIcon icon="loading" className="animate-spin mr-2" />{' '}
                    Saving...
                  </>
                ) : (
                  <>
                    <KeenIcon icon="check" className="mr-2" /> Save Changes
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
