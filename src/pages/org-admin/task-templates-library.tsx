import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganisation } from '@/providers/organisation-provider';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createTaskList,
  updateTaskList,
  deleteTaskList,
  duplicateTaskList,
} from '@/lib/api/tasks';
import { useTaskLists } from '@/hooks/use-tasks';
import { usePrograms } from '@/hooks/use-programs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SearchInput } from '@/components/common/search-input';
import { Label } from '@/components/ui/label';
import { Container } from '@/components/common/container';
import { KeenIcon } from '@/components/keenicons';
import { Badge } from '@/components/ui/badge';

export function TaskTemplatesLibraryPage() {
  const navigate = useNavigate();
  const { activeOrganisation } = useOrganisation();
  const queryClient = useQueryClient();
  const organisationId = activeOrganisation?.id;

  const [searchTerm, setSearchTerm] = useState('');
  const [isNewListDialogOpen, setIsNewListDialogOpen] = useState(false);
  const [isRenameListDialogOpen, setIsRenameListDialogOpen] = useState(false);
  const [isDuplicateListDialogOpen, setIsDuplicateListDialogOpen] = useState(false);
  const [selectedTaskList, setSelectedTaskList] = useState<{ id: string, name: string } | null>(null);
  const [newListName, setNewListName] = useState('');
  const [editListName, setEditListName] = useState('');

  // Fetch task lists and programs
  const { data: taskLists = [], isLoading: isLoadingLists, error: listsError } = useTaskLists(organisationId);
  const { data: programs = [] } = usePrograms();

  if (listsError) {
    console.error('TaskTemplatesLibraryPage: Error fetching task lists:', listsError);
  }

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
      setIsNewListDialogOpen(false);
      setNewListName('');
      toast.success('Task list created successfully');
      navigate(`/org-admin/task-templates/${newList.id}`);
    },
  });

  // Update task list mutation
  const updateTaskListMutation = useMutation({
    mutationFn: (name: string) => updateTaskList(selectedTaskList!.id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-lists', organisationId] });
      setIsRenameListDialogOpen(false);
      setSelectedTaskList(null);
      setEditListName('');
      toast.success('Task list renamed successfully');
    },
  });

  // Duplicate task list mutation
  const duplicateTaskListMutation = useMutation({
    mutationFn: (name: string) => duplicateTaskList(selectedTaskList!.id, name, organisationId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-lists', organisationId] });
      setIsDuplicateListDialogOpen(false);
      setSelectedTaskList(null);
      setEditListName('');
      toast.success('Task list duplicated successfully');
    },
  });

  // Delete task list mutation
  const deleteTaskListMutation = useMutation({
    mutationFn: (id: string) => deleteTaskList(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-lists', organisationId] });
      toast.success('Task list deleted successfully');
    },
  });

  const handleDeleteList = (id: string) => {
    if (window.confirm('Are you sure you want to delete this entire task list? This will remove all tasks and subtasks within it and cannot be undone.')) {
      deleteTaskListMutation.mutate(id);
    }
  };

  const filteredLists = taskLists.filter(list => 
    list.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Container>
        <Toolbar>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between w-full gap-4">
            <ToolbarHeading
              title="Template Library"
              description="Manage master templates for mentoring programs"
            />
          </div>
        </Toolbar>
      </Container>

      <Container>
        <div className="grid gap-5 lg:gap-7.5">
          <Card>
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Search - limited width */}
                <div className="w-full sm:max-w-md">
                  <SearchInput
                    placeholder="Search templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onClear={() => setSearchTerm('')}
                  />
                </div>

                <div className="flex items-center justify-between sm:justify-end flex-1 gap-4">
                  <div className="text-sm font-medium text-muted-foreground bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                    {filteredLists.length} Templates
                  </div>
                  
                  <Button 
                    variant="primary" 
                    size="sm" 
                    className="shrink-0"
                    onClick={() => setIsNewListDialogOpen(true)}
                  >
                    <KeenIcon icon="plus" />
                    New Template
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {isLoadingLists ? (
            <div className="text-center py-20">
              <KeenIcon icon="loading" className="animate-spin text-3xl text-gray-400 mb-2" />
              <p className="text-muted-foreground">Loading templates...</p>
            </div>
          ) : filteredLists.length === 0 ? (
            <Card className="py-20">
              <CardContent className="flex flex-col items-center">
                <div className="size-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <KeenIcon icon="file-added" className="text-4xl text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No templates found</h3>
                <p className="text-muted-foreground text-center max-w-sm mb-6">
                  {searchTerm ? 'Try adjusting your search terms.' : 'Start by creating your first mentoring task template.'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setIsNewListDialogOpen(true)}>
                    <KeenIcon icon="plus" className="mr-2" /> Create Template
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-7.5">
              {filteredLists.map((list) => {
                const assignedPrograms = programs.filter(p => p.task_list_id === list.id);
                const taskCount = list.tasks?.length || 0;
                const subtaskCount = list.tasks?.reduce((acc, t) => acc + (t.subtasks?.length || 0), 0) || 0;

                return (
                  <Card key={list.id} className="p-7.5 flex flex-col h-full relative group hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-md">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-1.5 flex-wrap flex-1 pr-2">
                        <Badge variant={list.is_active ? 'success' : 'secondary'} appearance="light">
                          {list.is_active ? 'Active' : 'Archived'}
                        </Badge>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" mode="icon" className="size-8 shrink-0">
                            <KeenIcon icon="dots-vertical" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => {
                            setSelectedTaskList({ id: list.id, name: list.name });
                            setEditListName(list.name);
                            setIsRenameListDialogOpen(true);
                          }}>
                            <KeenIcon icon="pencil" className="mr-2" /> Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedTaskList({ id: list.id, name: list.name });
                            setEditListName(`${list.name} (Copy)`);
                            setIsDuplicateListDialogOpen(true);
                          }}>
                            <KeenIcon icon="copy" className="mr-2" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-danger focus:text-danger"
                            onClick={() => handleDeleteList(list.id)}
                          >
                            <KeenIcon icon="trash" className="mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex flex-col flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight">{list.name}</h3>
                      
                      {/* Sneak Peek of top 3 tasks */}
                      <div className="space-y-1.5 mb-4">
                        {list.tasks && list.tasks.length > 0 ? (
                          list.tasks.slice(0, 3).map((task, _idx) => (
                            <div key={task.id} className="flex items-center gap-2 text-xs text-gray-600 truncate">
                              <span className="size-1 rounded-full bg-gray-300 shrink-0" />
                              <span className="truncate">{task.name}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground italic">No tasks yet</p>
                        )}
                        {list.tasks && list.tasks.length > 3 && (
                          <p className="text-[10px] text-primary font-medium pl-3">
                            + {list.tasks.length - 3} more tasks
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4 font-bold uppercase tracking-tight bg-gray-50/50 p-2 rounded-lg border border-gray-100/50">
                        <div className="flex flex-col">
                          <span className="text-gray-900">{taskCount}</span>
                          <span>Tasks</span>
                        </div>
                        <div className="w-px h-6 bg-gray-200" />
                        <div className="flex flex-col">
                          <span className="text-gray-900">{subtaskCount}</span>
                          <span>Subtasks</span>
                        </div>
                      </div>

                      <div className="mb-6 border-t border-gray-50 pt-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Assigned Programs</p>
                        <div className="flex flex-wrap gap-1.5">
                          {assignedPrograms.length > 0 ? (
                            assignedPrograms.map(p => (
                              <Badge key={p.id} variant="primary" appearance="outline" size="xs" className="px-2 py-0.5 rounded-md border-primary/20 bg-primary-light/30">
                                {p.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">Not currently assigned</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between gap-3">
                      <Button 
                        variant="primary" 
                        size="sm" 
                        className="flex-1 rounded-xl shadow-lg shadow-primary/10"
                        onClick={() => navigate(`/org-admin/task-templates/${list.id}`)}
                      >
                        <KeenIcon icon="notepad-edit" className="mr-2" /> Edit Tasks
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </Container>

      {/* New List Dialog */}
      <Dialog open={isNewListDialogOpen} onOpenChange={setIsNewListDialogOpen}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create New Task Template</DialogTitle>
            <DialogDescription>
              Create a new master template for mentoring programs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="list-name">Template Name</Label>
              <Input
                id="list-name"
                placeholder="e.g. Executive Mentoring 2026"
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
              {createTaskListMutation.isPending ? 'Creating...' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename List Dialog */}
      <Dialog open={isRenameListDialogOpen} onOpenChange={setIsRenameListDialogOpen}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Rename Template</DialogTitle>
            <DialogDescription>Enter a new name for the selected template.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rename-list-name">Template Name</Label>
              <Input
                id="rename-list-name"
                value={editListName}
                onChange={(e) => setEditListName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameListDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => updateTaskListMutation.mutate(editListName)}
              disabled={!editListName.trim() || updateTaskListMutation.isPending}
            >
              {updateTaskListMutation.isPending ? 'Renaming...' : 'Rename Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate List Dialog */}
      <Dialog open={isDuplicateListDialogOpen} onOpenChange={setIsDuplicateListDialogOpen}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Duplicate Template</DialogTitle>
            <DialogDescription>Create a copy of this template with a new name.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="duplicate-list-name">New Template Name</Label>
              <Input
                id="duplicate-list-name"
                value={editListName}
                onChange={(e) => setEditListName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDuplicateListDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => duplicateTaskListMutation.mutate(editListName)}
              disabled={!editListName.trim() || duplicateTaskListMutation.isPending}
            >
              {duplicateTaskListMutation.isPending ? (
                <>
                  <KeenIcon icon="loading" className="animate-spin mr-2" />
                  Duplicating...
                </>
              ) : 'Duplicate Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
