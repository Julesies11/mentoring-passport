import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  fetchTaskLists,
  reorderMasterTasks,
  updateMasterSubTask,
  updateTask,
  type MasterSubTask,
  type Task,
} from '@/lib/api/tasks';
import { usePrograms } from '@/hooks/use-programs';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function TaskTemplateEditorPage() {
  const { id: taskListId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeOrganisation } = useOrganisation();
  const queryClient = useQueryClient();
  const organisationId = activeOrganisation?.id;

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

  // Fetch current task list details
  const { data: taskLists = [] } = useQuery({
    queryKey: ['task-lists', organisationId],
    queryFn: () => fetchTaskLists(organisationId!),
    enabled: !!organisationId,
  });
  
  const currentList = taskLists.find(l => l.id === taskListId);

  // Fetch programs to check assignment
  const { data: programs = [] } = usePrograms();
  const assignedPrograms = programs.filter(p => p.task_list_id === taskListId);

  // Fetch evidence types
  const { data: evidenceTypes = [] } = useQuery({
    queryKey: ['evidence-types'],
    queryFn: fetchEvidenceTypes,
  });

  // Fetch tasks for this list
  const {
    data: tasks = [],
    isLoading: isLoadingTasks,
    error,
  } = useQuery({
    queryKey: ['master-tasks', taskListId],
    queryFn: () => fetchTaskListTasks(taskListId!),
    enabled: !!taskListId,
  });

  // Automatically expand all tasks by default
  useEffect(() => {
    if (tasks.length > 0) {
      setExpandedTasks(new Set(tasks.map((task) => task.id)));
    }
  }, [tasks]);

  // Mutations (copied and adapted from original page)
  const createTaskMutation = useMutation({
    mutationFn: async (data: { task: Omit<Task, 'id' | 'created_at' | 'updated_at'>, subtasks: any[] }) => {
      const newTask = await createTask({
        ...data.task,
        organisation_id: organisationId!,
        task_list_id: taskListId!
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
      queryClient.invalidateQueries({ queryKey: ['master-tasks', taskListId] });
      setIsEditDialogOpen(false);
      setSelectedTask(null);
      setLocalSubTasks([]);
      toast.success('Task created successfully');
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) => updateTask(taskId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-tasks', taskListId] });
      setIsEditDialogOpen(false);
      setSelectedTask(null);
      toast.success('Task updated successfully');
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-tasks', taskListId] });
      setIsEditDialogOpen(false);
      setSelectedTask(null);
      toast.success('Task deleted');
    },
  });

  const createSubTaskMutation = useMutation({
    mutationFn: createMasterSubTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-tasks', taskListId] });
    },
  });

  const deleteSubTaskMutation = useMutation({
    mutationFn: deleteMasterSubTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-tasks', taskListId] });
    },
  });

  const updateSubTaskMutation = useMutation({
    mutationFn: ({ subtaskId, updates }: { subtaskId: string; updates: Partial<MasterSubTask> }) => 
      updateMasterSubTask(subtaskId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-tasks', taskListId] });
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
      queryClient.invalidateQueries({ queryKey: ['master-tasks', taskListId] });
    },
  });

  const reorderTasksMutation = useMutation({
    mutationFn: reorderMasterTasks,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-tasks', taskListId] });
    },
  });

  // Handlers
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
      setSubTaskFormData(prev => ({ ...prev, name: '', sort_order: localSubTasks.length + 2 }));
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

  const filteredTasks = tasks.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.evidence_type?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Container>
        <Toolbar>
          <div className="flex items-center gap-4 w-full">
            <Button variant="ghost" size="sm" mode="icon" onClick={() => navigate('/org-admin/task-templates')}>
              <KeenIcon icon="arrow-left" className="text-xl" />
            </Button>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between flex-1 gap-4">
              <ToolbarHeading
                title={currentList?.name || 'Edit Template'}
                description="Customise the tasks and evidence requirements for this template"
              />
              
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" mode="icon" className="size-9 rounded-full text-primary hover:bg-primary/5">
                      <KeenIcon icon="information-2" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-5 shadow-2xl rounded-2xl border-gray-100" align="end">
                    <div className="space-y-3">
                      <h4 className="font-bold text-gray-900 flex items-center gap-2">
                        <KeenIcon icon="shield-search" className="text-primary" />
                        Impact of Editing
                      </h4>
                      <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                        <p>Changes made here serve as the <strong>master blueprint</strong> for future mentoring programs.</p>
                        <Alert className="bg-primary-light/30 border-primary/10 p-3 rounded-xl mt-2">
                          <KeenIcon icon="notification-status" className="size-4 text-primary" />
                          <AlertDescription className="text-[11px] font-medium text-primary-active leading-snug">
                            Editing this template <strong>does not</strong> modify programs already in progress. Existing programs retain their original task list.
                          </AlertDescription>
                        </Alert>
                        <p className="text-[11px] pt-1 italic">To update an active program's tasks, visit the specific Program Settings page.</p>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <Button variant="primary" size="sm" onClick={openCreateDialog}>
                  <KeenIcon icon="plus" /> Add Task
                </Button>
              </div>
            </div>
          </div>
        </Toolbar>
      </Container>

      <Container>
        <div className="grid gap-5 lg:gap-7.5">
          {assignedPrograms.length > 0 && (
            <Alert className="bg-primary-light/20 border-primary/10 border rounded-2xl">
              <KeenIcon icon="information-5" className="text-primary" />
              <AlertTitle className="text-sm font-bold text-primary-active">Template in Use</AlertTitle>
              <AlertDescription className="text-xs text-primary-active/80">
                This template is currently assigned to: {assignedPrograms.map(p => p.name).join(', ')}.
              </AlertDescription>
            </Alert>
          )}

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
            <div className="p-0 min-w-0 w-full">
              {isLoadingTasks ? (
                <div className="text-center py-20">
                  <KeenIcon icon="loading" className="animate-spin text-3xl text-gray-400 mb-2" />
                  <p className="text-muted-foreground">Loading tasks...</p>
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <KeenIcon icon="document" className="text-5xl opacity-10 mb-4" />
                  <p>{searchTerm ? 'No tasks match your search.' : 'No tasks added to this template yet.'}</p>
                </div>
              ) : (
                <TaskSetupGrid
                  tasks={filteredTasks}
                  expandedTasks={expandedTasks}
                  onToggleExpand={handleToggleExpand}
                  onEdit={openEditDialog}
                  onDelete={(id) => { if(window.confirm('Delete this task and its subtasks?')) deleteTaskMutation.mutate(id); }}
                  onReorder={handleTaskReorder}
                  isDeleting={deleteTaskMutation.isPending}
                />
              )}
            </div>
          </div>
        </div>
      </Container>

      {/* Task Edit Dialog (Copied from original) */}
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
              <div className="grid gap-2">
                <Label className="text-xs font-bold text-gray-600 uppercase">Task Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Initial Goal Setting Session"
                  className="rounded-xl"
                />
              </div>

              <div className="grid gap-2">
                <Label className="text-xs font-bold text-gray-600 uppercase">Evidence Requirement</Label>
                <Select
                  value={formData.evidence_type_id}
                  onValueChange={(v) => setFormData({ ...formData, evidence_type_id: v })}
                >
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue placeholder="Select requirement" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {evidenceTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name} {type.requires_submission && '(Submission Required)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-50">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider">Subtasks</h4>
                <Badge appearance="light" size="xs">{localSubTasks.length}</Badge>
              </div>

              <div className="relative group">
                <Input
                  placeholder="New subtask (press enter)..."
                  value={subTaskFormData.name}
                  onChange={(e) => setSubTaskFormData({ ...subTaskFormData, name: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreateSubTask())}
                  className="h-12 pr-12 rounded-xl"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute right-1.5 top-1.5 size-9 p-0 hover:bg-primary hover:text-white rounded-lg"
                  onClick={handleCreateSubTask}
                >
                  <KeenIcon icon="plus" />
                </Button>
              </div>

              <div className="space-y-2">
                <Sortable
                  value={localSubTasks}
                  onValueChange={handleSubTaskReorder}
                  getItemValue={(item) => item.id}
                  className="space-y-2"
                >
                  {localSubTasks.map((subtask) => (
                    <SortableItem key={subtask.id} value={subtask.id}>
                      <div className="flex items-center gap-3 p-3 bg-gray-50/50 border border-gray-100 rounded-xl group">
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
                          className="border-none bg-transparent shadow-none p-0 h-auto font-medium focus-visible:ring-0"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          mode="icon"
                          className="size-8 text-gray-400 hover:text-danger opacity-0 group-hover:opacity-100"
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

          <DialogFooter className="p-4 sm:px-6 sm:py-5 border-t border-gray-100 bg-gray-50/30 gap-3">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleEditTask} disabled={!formData.name.trim()} className="rounded-xl px-8 shadow-lg shadow-primary/20">
              {selectedTask ? 'Save Changes' : 'Create Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
