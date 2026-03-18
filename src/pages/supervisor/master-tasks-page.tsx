import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useOrganisation } from '@/providers/organisation-provider';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
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
  const { user, role } = useAuth();
  const queryClient = useQueryClient();

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

  const { data: taskLists = [], isLoading: isLoadingLists } = useTaskLists();

  useEffect(() => {
    if (taskLists.length > 0 && !selectedTaskListId) {
      setSelectedTaskListId(taskLists[0].id);
    }
  }, [taskLists, selectedTaskListId]);

  const { data: evidenceTypes = [] } = useQuery({
    queryKey: ['evidence-types'],
    queryFn: fetchEvidenceTypes,
  });

  const {
    data: tasks = [],
    isLoading: isLoadingTasks,
    error,
  } = useQuery({
    queryKey: ['master-tasks', selectedTaskListId],
    queryFn: () => fetchTaskListTasks(selectedTaskListId!),
    enabled: !!selectedTaskListId,
  });

  useEffect(() => {
    if (tasks.length > 0) {
      setExpandedTasks(new Set(tasks.map((task) => task.id)));
    }
  }, [tasks]);

  const createTaskListMutation = useMutation({
    mutationFn: (name: string) => createTaskList({
      name,
      is_active: true,
      description: ''
    }),
    onSuccess: (newList) => {
      queryClient.invalidateQueries({ queryKey: ['task-lists'] });
      setSelectedTaskListId(newList.id);
      setIsNewListDialogOpen(false);
      setNewListName('');
      toast.success('Task list created successfully');
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: { task: Omit<Task, 'id' | 'created_at' | 'updated_at'>, subtasks: any[] }) => {
      if (!selectedTaskListId) throw new Error('Missing Task List ID');
      
      const newTask = await createTask({
        ...data.task,
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

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) => updateTask(taskId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-tasks', selectedTaskListId] });
      setIsEditDialogOpen(false);
      setSelectedTask(null);
      setFormData({ name: '', evidence_type_id: '', is_active: true });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-tasks', selectedTaskListId] });
      setIsEditDialogOpen(false);
      setSelectedTask(null);
    },
  });

  const handleDeleteTask = (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  const createSubTaskMutation = useMutation({
    mutationFn: createMasterSubTask,
    onSuccess: (newSubTask) => {
      queryClient.invalidateQueries({ queryKey: ['master-tasks', selectedTaskListId] });
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
    mutationFn: (subtaskId: string) => deleteMasterSubTask(subtaskId),
    onSuccess: (_, subtaskId) => {
      queryClient.invalidateQueries({ queryKey: ['master-tasks', selectedTaskListId] });
      setLocalSubTasks((prev) => prev.filter((st) => st.id !== subtaskId));
    },
  });

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

  const updateSubTaskMutation = useMutation({
    mutationFn: ({ subtaskId, updates }: { subtaskId: string; updates: Partial<MasterSubTask> }) => updateMasterSubTask(subtaskId, updates),
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

  const handleToggleExpand = (taskId: string) => {
    setExpandedTasks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) newSet.delete(taskId);
      else newSet.add(taskId);
      return newSet;
    });
  };

  const handleCreateSubTask = () => {
    if (!subTaskFormData.name.trim()) return;

    if (selectedTask) {
      createSubTaskMutation.mutate({
        task_id: selectedTask.id,
        name: subTaskFormData.name,
        evidence_type_id: subTaskFormData.evidence_type_id || evidenceTypes[0]?.id,
        sort_order: localSubTasks.length + 1,
      });
    } else {
      const newSubTask = {
        id: `temp-${Date.now()}`,
        task_id: 'temp',
        name: subTaskFormData.name,
        evidence_type_id: subTaskFormData.evidence_type_id || evidenceTypes[0]?.id,
        sort_order: localSubTasks.length + 1,
        evidence_type: evidenceTypes.find((t: any) => t.id === (subTaskFormData.evidence_type_id || evidenceTypes[0]?.id))
      };
      setLocalSubTasks((prev) => [...prev, newSubTask as any]);
      const fallback = evidenceTypes.find((t: any) => t.name.toLowerCase().includes('not applicable')) || evidenceTypes[0];
      setSubTaskFormData({ name: '', evidence_type_id: fallback?.id || '', sort_order: localSubTasks.length + 2 });
    }
  };

  const handleDeleteSubTask = (subtaskId: string) => {
    if (window.confirm('Are you sure?')) {
      if (subtaskId.startsWith('temp-')) {
        setLocalSubTasks((prev) => prev.filter((st) => st.id !== subtaskId));
      } else {
        deleteSubTaskMutation.mutate(subtaskId);
      }
    }
  };

  const handleSubTaskReorder = (newOrder: MasterSubTask[]) => {
    setLocalSubTasks(newOrder);
    if (selectedTask) updateSubTaskOrderMutation.mutate(newOrder);
  };

  const handleTaskReorder = (newOrder: Task[]) => {
    const updates = newOrder.map((task, index) => ({ id: task.id, sort_order: index + 1 }));
    reorderTasksMutation.mutate(updates);
  };

  const filteredTasks = tasks.filter(
    (task) =>
      task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.evidence_type?.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleEditTask = () => {
    if (!formData.name.trim() || !formData.evidence_type_id) return;

    if (selectedTask) {
      updateTaskMutation.mutate({
        taskId: selectedTask.id,
        updates: { name: formData.name, evidence_type_id: formData.evidence_type_id, is_active: formData.is_active },
      });
    } else {
      createTaskMutation.mutate({
        task: { name: formData.name, evidence_type_id: formData.evidence_type_id, sort_order: tasks.length + 1, is_active: formData.is_active },
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
    const fallback = evidenceTypes.find((t: any) => t.name.toLowerCase().includes('not applicable')) || evidenceTypes[0];
    setFormData({ name: '', evidence_type_id: fallback?.id || '', is_active: true });
    setSubTaskFormData({ name: '', evidence_type_id: fallback?.id || '', sort_order: 1 });
    setIsEditDialogOpen(true);
  };

  const openEditDialog = (task: Task) => {
    setSelectedTask(task);
    setLocalSubTasks(task.subtasks || []);
    setFormData({ name: task.name, evidence_type_id: task.evidence_type_id || '', is_active: task.is_active });
    const fallback = evidenceTypes.find((t: any) => t.name.toLowerCase().includes('not applicable')) || evidenceTypes[0];
    setSubTaskFormData({ name: '', evidence_type_id: fallback?.id || '', sort_order: (task.subtasks?.length || 0) + 1 });
    setIsEditDialogOpen(true);
  };

  const isAdmin = role === 'administrator' || role === 'org-admin';
  if (!user || (role !== 'supervisor' && !isAdmin)) {
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
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Organisation Task Lists"
            description="Manage master templates for mentoring programs"
          />
          <ToolbarActions>
            <div className="flex items-center gap-4">
              <Select value={selectedTaskListId || ''} onValueChange={setSelectedTaskListId}>
                <SelectTrigger className="h-10 w-[250px] bg-white">
                  <SelectValue placeholder="Select a task list" />
                </SelectTrigger>
                <SelectContent>
                  {taskLists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>{list.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {isAdmin && (
                <Button variant="primary" size="sm" onClick={() => setIsNewListDialogOpen(true)}>
                  <KeenIcon icon="plus" /> New List
                </Button>
              )}
            </div>
          </ToolbarActions>
        </Toolbar>
      </Container>

      <Container>
        <div className="grid gap-5 lg:gap-7.5">
          <Card>
            <CardContent className="p-5">
              <SearchInput
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClear={() => setSearchTerm('')}
              />
            </CardContent>
          </Card>

          <div className="border-0 sm:border sm:rounded-xl sm:bg-card sm:shadow-sm min-w-0 w-full overflow-hidden">
            <CardHeader className="hidden sm:flex flex-row items-center justify-end py-4">
              <Button variant="outline" size="sm" onClick={openCreateDialog} disabled={!selectedTaskListId}>
                <KeenIcon icon="plus" /> Add Task
              </Button>
            </CardHeader>
            <div className="p-0 min-w-0 w-full">
              {isLoadingTasks ? (
                <div className="text-center py-12 text-muted-foreground">
                  <KeenIcon icon="loading" className="animate-spin mb-2 text-2xl" />
                  <p>Loading tasks...</p>
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
          </div>
        </div>
      </Container>

      <Dialog open={isNewListDialogOpen} onOpenChange={setIsNewListDialogOpen}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create New Task List</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="list-name">List Name</Label>
            <Input id="list-name" value={newListName} onChange={(e) => setNewListName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewListDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => createTaskListMutation.mutate(newListName)} disabled={!newListName.trim() || createTaskListMutation.isPending}>
              Create List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent 
          className="max-w-[600px] h-[85dvh] w-[calc(100%-32px)] sm:w-full p-0 overflow-hidden flex flex-col border-none shadow-2xl rounded-2xl"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="p-4 sm:px-6 sm:py-5 border-b border-gray-100 flex-shrink-0">
            <DialogTitle className="text-lg sm:text-xl font-bold text-gray-900">
              {selectedTask ? 'Edit Task' : 'Add New Task'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 sm:px-6 sm:py-6 space-y-6">
            <div className="space-y-4">
              <div className="grid gap-1.5">
                <Label className="text-xs font-bold text-gray-600 uppercase">Task Name</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs font-bold text-gray-600 uppercase">Evidence Requirement</Label>
                <Select value={formData.evidence_type_id} onValueChange={(v) => setFormData({ ...formData, evidence_type_id: v })}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Select requirement" />
                  </SelectTrigger>
                  <SelectContent>
                    {evidenceTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-50">
              <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider">Subtasks ({localSubTasks.length})</h4>
              <div className="flex gap-2">
                <Input value={subTaskFormData.name} onChange={(e) => setSubTaskFormData({ ...subTaskFormData, name: e.target.value })} placeholder="New subtask..." />
                <Button size="sm" onClick={handleCreateSubTask} disabled={createSubTaskMutation.isPending || !subTaskFormData.name.trim()}>
                  <KeenIcon icon="plus" />
                </Button>
              </div>
              <div className="space-y-2">
                <Sortable value={localSubTasks} onValueChange={handleSubTaskReorder} getItemValue={(item) => item.id}>
                  {localSubTasks.map((st) => (
                    <SortableItem key={st.id} value={st.id}>
                      <div className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl group relative">
                        <SortableItemHandle><KeenIcon icon="dots-square-vertical" className="text-gray-400 cursor-grab" /></SortableItemHandle>
                        <Input defaultValue={st.name} className="border-none shadow-none bg-transparent" />
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteSubTask(st.id)}><KeenIcon icon="trash" /></Button>
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
