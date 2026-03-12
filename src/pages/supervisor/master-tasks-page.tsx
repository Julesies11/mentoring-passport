import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useOrganisation } from '@/providers/organisation-provider';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createMasterSubTask,
  createTask,
  deleteMasterSubTask,
  deleteTask,
  fetchEvidenceTypes,
  fetchTaskListTasks,
  reorderMasterTasks,
  updateMasterSubTask,
  updateTask,
  createTaskList,
  type MasterSubTask,
  type Task,
} from '@/lib/api/tasks';
import { useTaskLists } from '@/hooks/use-tasks';
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
  const { activeOrganisation, membershipRole } = useOrganisation();
  const queryClient = useQueryClient();
  const organisationId = activeOrganisation?.id;
  const isOrgAdmin = membershipRole === 'org-admin' || user?.role === 'administrator';

  const [searchTerm, setSearchTerm] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isNewListDialogOpen, setIsNewListDialogOpen] = useState(false);
  const [selectedTaskListId, setSelectedTaskListId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');
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

  // Fetch task lists
  const { data: taskLists = [], isLoading: isLoadingLists } = useTaskLists(organisationId);

  // Set initial task list if not set
  useEffect(() => {
    if (taskLists.length > 0 && !selectedTaskListId) {
      setSelectedTaskListId(taskLists[0].id);
    }
  }, [taskLists, selectedTaskListId]);

  // Fetch evidence types
  const { data: evidenceTypes = [] } = useQuery({
    queryKey: ['evidence-types'],
    queryFn: fetchEvidenceTypes,
  });

  // Fetch master tasks for selected list
  const {
    data: tasks = [],
    isLoading: isLoadingTasks,
    error,
  } = useQuery({
    queryKey: ['master-tasks', selectedTaskListId],
    queryFn: () => fetchTaskListTasks(selectedTaskListId!),
    enabled: !!selectedTaskListId,
  });

  // Automatically expand all tasks by default
  useEffect(() => {
    if (tasks.length > 0) {
      setExpandedTasks(new Set(tasks.map((task) => task.id)));
    }
  }, [tasks]);

  // Create task list mutation
  const createTaskListMutation = useMutation({
    mutationFn: (name: string) => createTaskList({
      name,
      organisation_id: organisationId!,
      is_active: true,
      description: ''
    }),
    onSuccess: (newList) => {
      queryClient.invalidateQueries({ queryKey: ['task-lists', organisationId] });
      setSelectedTaskListId(newList.id);
      setIsNewListDialogOpen(false);
      setNewListName('');
      toast.success('Task list created successfully');
    },
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: { task: Omit<Task, 'id' | 'created_at' | 'updated_at'>, subtasks: any[] }) => {
      if (!organisationId || !selectedTaskListId) throw new Error('Missing ID');
      
      const newTask = await createTask({
        ...data.task,
        organisation_id: organisationId,
        task_list_id: selectedTaskListId
      });
      
      if (data.subtasks && data.subtasks.length > 0) {
        await Promise.all(
          data.subtasks.map((st, index) => 
            createMasterSubTask({
              task_id: newTask.id,
              name: st.name,
              evidence_type_id: st.evidence_type_id,
              sort_order: index + 1
            })
          )
        );
      }
      return newTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-tasks', selectedTaskListId] });
      setIsEditDialogOpen(false);
      setSelectedTask(null);
      setLocalSubTasks([]);
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
      queryClient.invalidateQueries({ queryKey: ['master-tasks', selectedTaskListId] });
      setIsEditDialogOpen(false);
      setSelectedTask(null);
      setFormData({ name: '', evidence_type_id: '', is_active: true });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-tasks', selectedTaskListId] });
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
      queryClient.invalidateQueries({ queryKey: ['master-tasks', selectedTaskListId] });
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
      queryClient.invalidateQueries({ queryKey: ['master-tasks', selectedTaskListId] });
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
      queryClient.invalidateQueries({ queryKey: ['master-tasks', selectedTaskListId] });
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
      queryClient.invalidateQueries({ queryKey: ['master-tasks', selectedTaskListId] });
    },
  });

  const reorderTasksMutation = useMutation({
    mutationFn: reorderMasterTasks,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-tasks', selectedTaskListId] });
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
    if (!subTaskFormData.name.trim()) {
      return;
    }

    if (selectedTask) {
      createSubTaskMutation.mutate({
        task_id: selectedTask.id,
        name: subTaskFormData.name,
        evidence_type_id:
          subTaskFormData.evidence_type_id || evidenceTypes[0]?.id,
        sort_order: localSubTasks.length + 1,
      });
    } else {
      // Temporary subtask creation for new tasks
      const newSubTask = {
        id: `temp-${Date.now()}`,
        task_id: 'temp',
        name: subTaskFormData.name,
        evidence_type_id: subTaskFormData.evidence_type_id || evidenceTypes[0]?.id,
        sort_order: localSubTasks.length + 1,
        evidence_type: evidenceTypes.find((t: any) => t.id === (subTaskFormData.evidence_type_id || evidenceTypes[0]?.id))
      };
      
      setLocalSubTasks((prev) => [...prev, newSubTask as any]);
      
      const fallback =
        evidenceTypes.find((t: any) =>
          t.name.toLowerCase().includes('not applicable'),
        ) || evidenceTypes[0];
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

  const handleSubTaskReorder = (newOrder: MasterSubTask[]) => {
    setLocalSubTasks(newOrder);
    if (selectedTask) {
      updateSubTaskOrderMutation.mutate(newOrder);
    }
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
        task: {
          name: formData.name,
          evidence_type_id: formData.evidence_type_id,
          sort_order: tasks.length + 1,
          is_active: formData.is_active,
        },
        subtasks: localSubTasks
      });
    }
  };

  const openCreateDialog = () => {
    if (!selectedTaskListId) {
      toast.error('Please select or create a task list first');
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

  if (!user || (user.role !== 'supervisor' && user.role !== 'administrator')) {
    return (
      <Container>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="size-20 rounded-full bg-danger-light flex items-center justify-center mb-4">
              <KeenIcon icon="shield-slash" className="text-3xl text-danger" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              You don't have permission to access the Task Lists.
            </p>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <>
      <Container>
        <Toolbar>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between w-full gap-4">
            <ToolbarHeading
              title="Organisation Task Lists"
              description="Manage master templates for mentoring programs"
            />
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 min-w-0">
              <div className="flex items-center gap-2 min-w-0 max-w-full">
                <Label htmlFor="taskListSelect" className="shrink-0 text-sm font-medium hidden sm:block">List:</Label>
                <Select
                  value={selectedTaskListId || ''}
                  onValueChange={setSelectedTaskListId}
                >
                  <SelectTrigger id="taskListSelect" className="h-10 w-full sm:w-[250px] bg-white">
                    <SelectValue placeholder="Select a task list" />
                  </SelectTrigger>
                  <SelectContent>
                    {taskLists.map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        {list.name}
                      </SelectItem>
                    ))}
                    {taskLists.length === 0 && !isLoadingLists && (
                      <SelectItem value="none" disabled>No lists found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              {isOrgAdmin && (
                <Button 
                  variant="primary" 
                  size="sm" 
                  className="shrink-0 h-10 px-4"
                  onClick={() => setIsNewListDialogOpen(true)}
                >
                  <KeenIcon icon="plus" />
                  New List
                </Button>
              )}
            </div>
          </div>
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

          <div className="border-0 sm:border sm:rounded-xl sm:bg-card sm:shadow-sm min-w-0 w-full">
            <CardHeader className="hidden sm:flex flex-row items-center justify-end py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={openCreateDialog}
                disabled={!selectedTaskListId}
              >
                <KeenIcon icon="plus" />
                Add Task
              </Button>
            </CardHeader>
            <div className="p-0 min-w-0 w-full">
              {isLoadingTasks || isLoadingLists ? (
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
              ) : !selectedTaskListId ? (
                <div className="text-center py-12 text-muted-foreground">
                  <KeenIcon icon="list" className="text-4xl mb-2 opacity-20" />
                  <p>Select or create a task list to get started</p>
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
                      : 'Get started by adding your first task to this list'}
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
            </div>
            {/* Mobile Floating Action Button */}
            <div className="sm:hidden fixed bottom-20 right-4 z-50">
              <Button
                size="lg"
                className="rounded-full shadow-lg h-14 w-14 p-0 flex items-center justify-center bg-primary text-white"
                onClick={openCreateDialog}
                disabled={!selectedTaskListId}
              >
                <KeenIcon icon="plus" className="text-2xl" />
              </Button>
            </div>
          </div>
        </div>
      </Container>

      {/* New List Dialog */}
      <Dialog open={isNewListDialogOpen} onOpenChange={setIsNewListDialogOpen}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create New Task List</DialogTitle>
            <DialogDescription>
              Create a new master template for mentoring programs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="list-name">List Name</Label>
              <Input
                id="list-name"
                placeholder="e.g. Standard Mentoring Program"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewListDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => createTaskListMutation.mutate(newListName)}
              disabled={!newListName.trim() || createTaskListMutation.isPending}
            >
              {createTaskListMutation.isPending ? 'Creating...' : 'Create List'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent 
          className="max-w-[600px] h-[85dvh] w-[calc(100%-32px)] sm:w-full p-0 overflow-hidden flex flex-col border-none shadow-2xl rounded-2xl"
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="p-4 sm:px-6 sm:py-5 border-b border-gray-100 flex-shrink-0">
            <DialogTitle className="text-lg sm:text-xl font-bold text-gray-900">
              {selectedTask ? 'Edit Task & Subtasks' : 'Add New Task'}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
              Refine the task details and manage sequential subtasks.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto kt-scrollable-y-hover p-4 sm:px-6 sm:py-6 space-y-6 sm:space-y-8">
            {/* Main Task Info Section */}
            <div className="space-y-4 sm:space-y-5">
              <div className="grid gap-4 sm:gap-5">
                <div className="grid gap-1.5 sm:gap-2">
                  <Label
                    htmlFor="edit-task-name"
                    className="text-[10px] sm:text-xs font-bold text-gray-600 uppercase tracking-wider px-1"
                  >
                    Task Name
                  </Label>
                  <Input
                    id="edit-task-name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="h-10 sm:h-11 border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-xl"
                    placeholder="Enter task name..."
                  />
                </div>

                <div className="grid gap-1.5 sm:gap-2">
                  <Label
                    htmlFor="edit-evidence-type"
                    className="text-[10px] sm:text-xs font-bold text-gray-600 uppercase tracking-wider px-1"
                  >
                    Evidence Requirement *
                  </Label>
                  <Select
                    value={formData.evidence_type_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, evidence_type_id: value })
                    }
                  >
                    <SelectTrigger className="h-10 sm:h-11 border-gray-200 rounded-xl">
                      <SelectValue placeholder="Select requirement" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-2xl border-gray-100 max-w-[calc(100vw-4rem)]">
                      {evidenceTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id} className="py-2.5">
                          <div className="flex items-start sm:items-center justify-between w-full gap-2 sm:gap-4 flex-col sm:flex-row">
                            <span
                              className={cn(
                                "text-xs sm:text-sm whitespace-normal text-left",
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
                                className="gap-1 px-1.5 shrink-0"
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
            <div className="space-y-4 sm:space-y-5">
              <div className="flex items-center justify-between pb-1 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <div className="size-7 sm:size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <KeenIcon icon="list" className="text-primary text-sm sm:text-base" />
                  </div>
                  <h4 className="font-bold text-gray-800 text-xs sm:text-sm uppercase tracking-wider">
                    Subtasks ({localSubTasks.length})
                  </h4>
                </div>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium bg-gray-100 px-2 py-0.5 rounded-full uppercase">
                  Drag to reorder
                </p>
              </div>

              <div className="relative group">
                <Input
                  placeholder="New subtask (press enter)..."
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
                  className="h-10 sm:h-12 pl-3 sm:pl-4 pr-10 sm:pr-12 border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary/20 shadow-sm rounded-xl text-xs sm:text-sm"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute right-1 sm:right-1.5 top-1 sm:top-1.5 size-8 sm:size-9 p-0 hover:bg-primary hover:text-white rounded-lg transition-all"
                  onClick={handleCreateSubTask}
                  disabled={
                    createSubTaskMutation.isPending ||
                    !subTaskFormData.name.trim()
                  }
                >
                  {createSubTaskMutation.isPending ? (
                    <KeenIcon icon="loading" className="animate-spin" />
                  ) : (
                    <KeenIcon icon="plus" className="text-base sm:text-lg" />
                  )}
                </Button>
              </div>

              <div className="min-h-[100px]">
                {localSubTasks.length === 0 ? (
                  <div className="text-center py-8 sm:py-10 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
                    <KeenIcon
                      icon="file-added"
                      className="text-2xl sm:text-3xl text-gray-200 mb-2"
                    />
                    <p className="text-xs sm:text-sm text-muted-foreground italic">
                      No subtasks defined yet
                    </p>
                  </div>
                ) : (
                  <Sortable
                    value={localSubTasks}
                    onValueChange={handleSubTaskReorder}
                    getItemValue={(item) => item.id}
                    className="space-y-2.5 sm:space-y-3"
                  >
                    {localSubTasks.map((subtask) => (
                      <SortableItem key={subtask.id} value={subtask.id}>
                        <div className="flex items-start sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-white border border-gray-100 rounded-2xl hover:border-primary/40 hover:shadow-md transition-all group relative overflow-hidden">
                          <SortableItemHandle>
                            <div className="flex items-center justify-center size-7 sm:size-8 rounded-lg bg-gray-50 group-hover:bg-primary/5 transition-colors cursor-grab active:cursor-grabbing mt-0.5 sm:mt-0 shrink-0">
                              <KeenIcon
                                icon="dots-square-vertical"
                                className="text-gray-400 group-hover:text-primary text-sm sm:text-base"
                              />
                            </div>
                          </SortableItemHandle>

                          <div className="flex-1 flex flex-col min-w-0 pr-8 sm:pr-10">
                            <Input
                              defaultValue={subtask.name}
                              onBlur={(e) => {
                                if (
                                  e.target.value !== subtask.name &&
                                  e.target.value.trim()
                                ) {
                                  if (subtask.id.startsWith('temp-')) {
                                    setLocalSubTasks(prev => prev.map(st => st.id === subtask.id ? { ...st, name: e.target.value.trim() } : st));
                                  } else {
                                    updateSubTaskMutation.mutate({
                                      subtaskId: subtask.id,
                                      updates: { name: e.target.value.trim() },
                                    });
                                  }
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                              className="border-none focus:ring-0 focus:border-none shadow-none px-0 h-auto text-xs sm:text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors bg-transparent break-words whitespace-normal"
                            />

                            <div className="flex flex-wrap items-center gap-2 mt-1 sm:mt-1.5">
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
                                    if (subtask.id.startsWith('temp-')) {
                                      setLocalSubTasks(prev => prev.map(st => st.id === subtask.id ? { ...st, evidence_type_id: value || fallback?.id } : st));
                                    } else {
                                      updateSubTaskMutation.mutate({
                                        subtaskId: subtask.id,
                                        updates: {
                                          evidence_type_id: value || fallback?.id,
                                        },
                                      });
                                    }
                                  }
                                }}
                              >
                                <SelectTrigger className="h-6 sm:h-7 border-none bg-gray-100 hover:bg-gray-200 text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-tight py-0 px-2 rounded-md shadow-none w-auto gap-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="max-w-[calc(100vw-5rem)]">
                                  {evidenceTypes.map((type) => (
                                    <SelectItem
                                      key={type.id}
                                      value={type.id}
                                      className="text-[10px] sm:text-xs"
                                    >
                                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-1 sm:gap-4">
                                        <span
                                          className={cn(
                                            "whitespace-normal text-left leading-tight",
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
                                            className="gap-1 px-1.5 py-0.5 text-[8px] h-auto shrink-0"
                                          >
                                            <KeenIcon
                                              icon="cloud-upload"
                                              className="text-[8px]"
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

                          <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 flex items-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              mode="icon"
                              className="size-8 sm:size-9 text-gray-400 hover:text-danger hover:bg-danger/5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all rounded-xl"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSubTask(subtask.id);
                              }}
                              disabled={
                                deleteSubTaskMutation.isPending ||
                                updateSubTaskMutation.isPending
                              }
                            >
                              <KeenIcon icon="trash" className="text-base sm:text-lg" />
                            </Button>
                          </div>
                        </div>
                      </SortableItem>
                    ))}
                  </Sortable>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className={cn(
            "p-4 sm:px-6 sm:py-5 border-t border-gray-100 flex-shrink-0 bg-gray-50/30",
            selectedTask ? "flex flex-col sm:flex-row sm:justify-between gap-3 sm:gap-0" : "flex flex-col sm:flex-row sm:justify-end gap-3 sm:gap-0"
          )}>
            {selectedTask && (
              <Button
                variant="outline"
                className="h-10 sm:h-11 px-6 rounded-xl font-bold border-danger/20 text-danger hover:bg-danger hover:text-white order-3 sm:order-1 transition-colors"
                onClick={() => handleDeleteTask(selectedTask.id)}
                disabled={deleteTaskMutation.isPending}
              >
                <KeenIcon icon="trash" className="mr-1.5" />
                Delete Task
              </Button>
            )}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 order-1 sm:order-2 w-full sm:w-auto">
              <Button
                variant="outline"
                className="h-10 sm:h-11 px-6 rounded-xl font-bold border-gray-200 order-2 sm:order-1"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={updateTaskMutation.isPending || createTaskMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                className="h-10 sm:h-11 px-8 rounded-xl font-bold shadow-lg shadow-primary/20 order-1 sm:order-2"
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
                    <KeenIcon icon="loading" className="animate-spin mr-1.5 sm:mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <KeenIcon icon="check" className="mr-1.5 sm:mr-2" /> {selectedTask ? 'Save Changes' : 'Create Task'}
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
