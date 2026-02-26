import { useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchTasks, 
  toggleTaskActive, 
  createTask, 
  updateTask, 
  fetchMasterSubTasks,
  createMasterSubTask,
  updateMasterSubTask,
  deleteMasterSubTask,
  type Task,
  type MasterSubTask 
} from '@/lib/api/tasks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import {
  Plus,
  Edit,
  Archive,
  ArchiveRestore,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  List,
  PlusCircle,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { SubTaskRow } from '@/components/tasks/subtask-row';

// Mock evidence types - replace with actual API call
const evidenceTypes = [
  { id: '1', name: 'Clinical Documentation', requires_submission: true },
  { id: '2', name: 'Case Study', requires_submission: true },
  { id: '3', name: 'Reflection', requires_submission: false },
  { id: '4', name: 'Peer Review', requires_submission: false },
];

export function SupervisorMasterTasksPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubTaskDialogOpen, setIsSubTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    name: '',
    evidence_type_id: '',
    sort_order: 0,
    is_active: true,
  });
  const [subTaskFormData, setSubTaskFormData] = useState({
    name: '',
    evidence_type_id: '',
    sort_order: 0,
  });

  // Fetch master tasks
  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['master-tasks', showInactive],
    queryFn: () => fetchTasks(showInactive),
    enabled: user?.role === 'supervisor',
  });

  // Toggle task active status
  const toggleActiveMutation = useMutation({
    mutationFn: ({ taskId, isActive }: { taskId: string; isActive: boolean }) =>
      toggleTaskActive(taskId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-tasks'] });
    },
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-tasks'] });
      setIsCreateDialogOpen(false);
      setFormData({ name: '', evidence_type_id: '', sort_order: 0, is_active: true });
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) =>
      updateTask(taskId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-tasks'] });
      setIsEditDialogOpen(false);
      setSelectedTask(null);
      setFormData({ name: '', evidence_type_id: '', sort_order: 0, is_active: true });
    },
  });

  // Create subtask mutation
  const createSubTaskMutation = useMutation({
    mutationFn: (subtask: Omit<MasterSubTask, 'id' | 'created_at' | 'updated_at'>) =>
      createMasterSubTask(subtask),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-subtasks'] });
      setIsSubTaskDialogOpen(false);
      setSubTaskFormData({ name: '', evidence_type_id: '', sort_order: 0 });
    },
  });

  // Update subtask mutation
  const updateSubTaskMutation = useMutation({
    mutationFn: ({ subtaskId, updates }: { subtaskId: string; updates: Partial<MasterSubTask> }) =>
      updateMasterSubTask(subtaskId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-subtasks'] });
    },
  });

  // Delete subtask mutation
  const deleteSubTaskMutation = useMutation({
    mutationFn: deleteMasterSubTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-subtasks'] });
    },
  });

  const handleToggleActive = (taskId: string, isActive: boolean) => {
    toggleActiveMutation.mutate({ taskId, isActive });
  };

  // Subtask handlers
  const handleToggleExpand = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleManageSubTasks = (task: Task) => {
    setSelectedTask(task);
    setIsSubTaskDialogOpen(true);
  };

  const handleCreateSubTask = () => {
    if (!subTaskFormData.name.trim()) {
      return;
    }
    
    createSubTaskMutation.mutate({
      task_id: selectedTask!.id,
      name: subTaskFormData.name,
      evidence_type_id: subTaskFormData.evidence_type_id || null,
      sort_order: subTaskFormData.sort_order,
    });
  };

  const handleEditSubTask = (subtask: MasterSubTask) => {
    setSubTaskFormData({
      name: subtask.name,
      evidence_type_id: subtask.evidence_type_id || '',
      sort_order: subtask.sort_order,
    });
    // TODO: Implement edit mode for subtasks
  };

  const handleDeleteSubTask = (subtaskId: string) => {
    if (confirm('Are you sure you want to delete this subtask? This action cannot be undone.')) {
      deleteSubTaskMutation.mutate(subtaskId);
    }
  };

  // Filter tasks based on search
  const filteredTasks = tasks.filter(task =>
    task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.evidence_type?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateTask = () => {
    if (!formData.name.trim()) {
      return;
    }
    
    createTaskMutation.mutate({
      name: formData.name,
      evidence_type_id: formData.evidence_type_id || null,
      sort_order: formData.sort_order,
      is_active: formData.is_active,
    });
  };

  const handleEditTask = () => {
    if (!selectedTask || !formData.name.trim()) {
      return;
    }
    
    updateTaskMutation.mutate({
      taskId: selectedTask.id,
      updates: {
        name: formData.name,
        evidence_type_id: formData.evidence_type_id || null,
        sort_order: formData.sort_order,
        is_active: formData.is_active,
      },
    });
  };

  const openEditDialog = (task: Task) => {
    setSelectedTask(task);
    setFormData({
      name: task.name,
      evidence_type_id: task.evidence_type_id || '',
      sort_order: task.sort_order,
      is_active: task.is_active,
    });
    setIsEditDialogOpen(true);
  };

  if (user?.role !== 'supervisor') {
    return (
      <div className="container-fixed py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-muted-foreground">Access Denied</h3>
              <p className="text-sm text-muted-foreground mt-2">
                You don't have permission to access the Master Task List.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-fixed py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Master Task List</h1>
            <p className="text-muted-foreground">
              Manage the master list of tasks available for all mentoring pairs
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label htmlFor="show-inactive" className="text-sm">
                Show Inactive
              </Label>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                  <DialogDescription>
                    Add a new task to the master list. This will be available for all mentoring pairs.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="task-name">Task Name *</Label>
                    <Input
                      id="task-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter task name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="evidence-type">Evidence Type</Label>
                    <Select
                      value={formData.evidence_type_id}
                      onValueChange={(value) => setFormData({ ...formData, evidence_type_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select evidence type" />
                      </SelectTrigger>
                      <SelectContent>
                        {evidenceTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            <div className="flex items-center gap-2">
                              {type.name}
                              {type.requires_submission && (
                                <Badge variant="destructive" className="text-xs">
                                  Required
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="sort-order">Sort Order</Label>
                    <Input
                      id="sort-order"
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      id="task-active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="task-active">Active</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTask}>
                    Create Task
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
                {filteredTasks.length} of {tasks.length} tasks
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Table */}
        <Card>
          <CardHeader>
            <CardTitle>Tasks ({filteredTasks.length})</CardTitle>
            <CardDescription>
              Master list of all tasks. Active tasks are automatically assigned to new mentoring pairs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">Loading tasks...</div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-red-600">Error loading tasks</div>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-muted-foreground">No tasks found</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first task'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium">Task Name</th>
                      <th className="text-left p-4 font-medium">Evidence Type</th>
                      <th className="text-left p-4 font-medium">Sort Order</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Created</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map((task) => (
                      <tr key={task.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <div className="space-y-2">
                            <div className="font-medium">{task.name}</div>
                            <SubTaskRow
                              taskId={task.id}
                              isExpanded={expandedTasks.has(task.id)}
                              onToggle={() => handleToggleExpand(task.id)}
                              onManageSubTasks={() => handleManageSubTasks(task)}
                            />
                          </div>
                        </td>
                        <td className="p-4">
                          {task.evidence_type ? (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{task.evidence_type.name}</Badge>
                              {task.evidence_type.requires_submission && (
                                <Badge variant="destructive" className="text-xs">
                                  Required
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">None</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="text-muted-foreground">{task.sort_order}</span>
                        </td>
                        <td className="p-4">
                          <Badge
                            className={cn(
                              task.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            )}
                          >
                            {task.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(task.created_at), 'MMM d, yyyy')}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(task)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(task.id, !task.is_active)}
                              disabled={toggleActiveMutation.isPending}
                            >
                              {task.is_active ? (
                                <Archive className="h-4 w-4" />
                              ) : (
                                <ArchiveRestore className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update the task details. Changes will affect future mentoring pairs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-task-name">Task Name *</Label>
              <Input
                id="edit-task-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter task name"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-evidence-type">Evidence Type</Label>
              <Select
                value={formData.evidence_type_id}
                onValueChange={(value) => setFormData({ ...formData, evidence_type_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select evidence type" />
                </SelectTrigger>
                <SelectContent>
                  {evidenceTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        {type.name}
                        {type.requires_submission && (
                          <Badge variant="destructive" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="edit-sort-order">Sort Order</Label>
              <Input
                id="edit-sort-order"
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                id="edit-task-active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="edit-task-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditTask}>
              Update Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SubTask Management Dialog */}
      <Dialog open={isSubTaskDialogOpen} onOpenChange={setIsSubTaskDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Manage Subtasks</DialogTitle>
            <DialogDescription>
              Add and manage subtasks for "{selectedTask?.name}". Subtasks allow for more granular tracking of evidence requirements.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Add New Subtask */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">Add New Subtask</h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="subtask-name">Subtask Name *</Label>
                  <Input
                    id="subtask-name"
                    value={subTaskFormData.name}
                    onChange={(e) => setSubTaskFormData({ ...subTaskFormData, name: e.target.value })}
                    placeholder="Enter subtask name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="subtask-evidence-type">Evidence Type</Label>
                  <Select
                    value={subTaskFormData.evidence_type_id}
                    onValueChange={(value) => setSubTaskFormData({ ...subTaskFormData, evidence_type_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select evidence type" />
                    </SelectTrigger>
                    <SelectContent>
                      {evidenceTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          <div className="flex items-center gap-2">
                            {type.name}
                            {type.requires_submission && (
                              <Badge variant="destructive" className="text-xs">
                                Required
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="subtask-sort-order">Sort Order</Label>
                  <Input
                    id="subtask-sort-order"
                    type="number"
                    value={subTaskFormData.sort_order}
                    onChange={(e) => setSubTaskFormData({ ...subTaskFormData, sort_order: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                
                <Button onClick={handleCreateSubTask} disabled={createSubTaskMutation.isPending}>
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Add Subtask
                </Button>
              </div>
            </div>

            {/* Existing Subtasks */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">Existing Subtasks</h4>
              {/* TODO: Display existing subtasks with edit/delete functionality */}
              <div className="text-sm text-muted-foreground">
                Subtask list will be displayed here. Edit and delete functionality coming soon.
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubTaskDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
