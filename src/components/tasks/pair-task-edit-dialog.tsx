import { Fragment, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchEvidenceTypes,
  type PairSubTask,
  type PairTask,
} from '@/lib/api/tasks';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
import { KeenIcon } from '@/components/keenicons';

interface PairTaskEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: (PairTask & { evidence?: any[] }) | null;
  onUpdateTask: (taskId: string, updates: Partial<PairTask>) => void;
  onDeleteTask: (taskId: string) => void;
  onCreateSubTask: (
    taskId: string,
    name: string,
    evidenceTypeId: string,
  ) => void;
  onUpdateSubTask: (subtaskId: string, updates: Partial<PairSubTask>) => void;
  onDeleteSubTask: (subtaskId: string) => void;
  onReorderSubTasks: (taskId: string, newOrder: PairSubTask[]) => void;
  isUpdating?: boolean;
  readOnly?: boolean;
}

export function PairTaskEditDialog({
  open,
  onOpenChange,
  task,
  onUpdateTask,
  onDeleteTask,
  onCreateSubTask,
  onUpdateSubTask,
  onDeleteSubTask,
  onReorderSubTasks,
  isUpdating = false,
  readOnly = false,
}: PairTaskEditDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    evidence_type_id: '',
  });
  const [subTaskName, setSubTaskName] = useState('');
  const [localSubTasks, setLocalSubTasks] = useState<PairSubTask[]>([]);

  // Fetch evidence types
  const { data: evidenceTypes = [] } = useQuery({
    queryKey: ['evidence-types'],
    queryFn: fetchEvidenceTypes,
  });

  useEffect(() => {
    if (task) {
      setFormData({
        name: task.name,
        evidence_type_id: task.evidence_type_id || '',
      });
      setLocalSubTasks(task.subtasks || []);
    }
  }, [task]);

  const handleSaveTask = () => {
    if (task && formData.name.trim() && formData.evidence_type_id) {
      onUpdateTask(task.id, {
        name: formData.name,
        evidence_type_id: formData.evidence_type_id,
      });
    }
  };

  const handleCreateSubTask = () => {
    if (task && subTaskName.trim()) {
      const fallback =
        evidenceTypes.find((t: any) =>
          t.name.toLowerCase().includes('not applicable'),
        ) || evidenceTypes[0];
      onCreateSubTask(task.id, subTaskName, fallback?.id || '');
      setSubTaskName('');
    }
  };

  const handleSubTaskReorder = (newOrder: PairSubTask[]) => {
    setLocalSubTasks(newOrder);
    if (task) {
      onReorderSubTasks(task.id, newOrder);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px] h-[85vh] p-0 overflow-hidden flex flex-col border-none shadow-2xl">
        <DialogHeader className="px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-gray-900">
            {readOnly
              ? 'Task Progress & Evidence'
              : 'Edit Pair Task & Subtasks'}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            {readOnly
              ? 'View progress details and submitted evidence for this task.'
              : 'Customize this task specifically for this mentoring pair.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto kt-scrollable-y-hover px-6 py-6 space-y-8">
          {/* Evidence Section (Show if exists) */}
          {task.evidence && task.evidence.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-gray-50">
                <div className="size-8 rounded-lg bg-success/10 flex items-center justify-center">
                  <KeenIcon
                    icon="file-done"
                    className="text-success text-base"
                  />
                </div>
                <h4 className="font-bold text-gray-800 text-sm uppercase tracking-wider">
                  Evidence Submissions
                </h4>
              </div>

              <div className="space-y-3">
                {task.evidence.map((ev: any) => (
                  <div
                    key={ev.id}
                    className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            'capitalize text-[10px] font-bold',
                            ev.status === 'approved'
                              ? 'text-success border-success/20 bg-success/5'
                              : ev.status === 'rejected'
                                ? 'text-danger border-danger/20 bg-danger/5'
                                : 'text-yellow-600 border-yellow-200 bg-yellow-50',
                          )}
                        >
                          {ev.status}
                        </Badge>
                        {ev.subtask && (
                          <Badge
                            variant="outline"
                            className="text-[9px] border-gray-200 bg-white"
                          >
                            Sub-task: {ev.subtask.name}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {new Date(ev.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {ev.description && (
                      <p className="text-sm text-gray-700 leading-relaxed italic">
                        "{ev.description}"
                      </p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-9 rounded-xl font-bold gap-2"
                      onClick={() => window.open(ev.file_url, '_blank')}
                    >
                      <KeenIcon icon="eye" />
                      View Evidence File
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                {readOnly ? (
                  <div className="h-11 flex items-center px-4 rounded-lg border border-gray-100 bg-gray-50 text-sm font-bold text-gray-900">
                    {formData.name}
                  </div>
                ) : (
                  <Input
                    id="edit-task-name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="h-11 border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary/20"
                    placeholder="Enter task name..."
                  />
                )}
              </div>

              <div className="grid gap-2">
                <Label
                  htmlFor="edit-evidence-type"
                  className="text-xs font-bold text-gray-600 uppercase"
                >
                  Evidence Requirement *
                </Label>
                {readOnly ? (
                  <div className="h-11 flex items-center px-4 rounded-lg border border-gray-100 bg-gray-50 text-sm font-medium text-gray-700">
                    {evidenceTypes.find(
                      (t: any) => t.id === formData.evidence_type_id,
                    )?.name || 'None'}
                  </div>
                ) : (
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
                      {evidenceTypes.map((type: any) => (
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
                )}
              </div>
            </div>
          </div>

          {/* Subtasks Section */}
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
              {!readOnly && (
                <p className="text-[10px] text-muted-foreground font-medium bg-gray-100 px-2 py-0.5 rounded-full uppercase">
                  Drag to reorder
                </p>
              )}
            </div>

            {/* Subtask Add Form */}
            {!readOnly && (
              <div className="relative group">
                <Input
                  placeholder="Type a new subtask and press enter..."
                  value={subTaskName}
                  onChange={(e) => setSubTaskName(e.target.value)}
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
                  disabled={!subTaskName.trim()}
                >
                  <KeenIcon icon="plus" className="text-lg" />
                </Button>
              </div>
            )}

            {/* Subtask Sortable List */}
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
                  disabled={readOnly}
                >
                  {localSubTasks.map((subtask) => (
                    <SortableItem key={subtask.id} value={subtask.id}>
                      <div className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl hover:border-primary/40 hover:shadow-md transition-all group relative overflow-hidden">
                        {!readOnly && (
                          <SortableItemHandle>
                            <div className="flex items-center justify-center size-8 rounded-lg bg-gray-50 group-hover:bg-primary/5 transition-colors cursor-grab active:cursor-grabbing">
                              <KeenIcon
                                icon="dots-square-vertical"
                                className="text-gray-400 group-hover:text-primary"
                              />
                            </div>
                          </SortableItemHandle>
                        )}

                        <div className="flex-1 flex flex-col min-w-0 pr-10">
                          {readOnly ? (
                            <div className="flex items-center gap-2">
                              <KeenIcon
                                icon="check-square"
                                className={cn(
                                  'text-base',
                                  subtask.is_completed
                                    ? 'text-success'
                                    : 'text-gray-300',
                                )}
                              />
                              <span className="text-sm font-semibold text-gray-900 truncate">
                                {subtask.name}
                              </span>
                            </div>
                          ) : (
                            <Input
                              defaultValue={subtask.name}
                              onBlur={(e) => {
                                if (
                                  e.target.value !== subtask.name &&
                                  e.target.value.trim()
                                ) {
                                  onUpdateSubTask(subtask.id, {
                                    name: e.target.value.trim(),
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
                          )}

                          <div className="flex items-center gap-2 mt-1">
                            {readOnly ? (
                              <span className="text-[10px] text-gray-500 font-medium uppercase tracking-tighter bg-gray-50 px-2 py-0.5 rounded">
                                {evidenceTypes.find(
                                  (t: any) => t.id === subtask.evidence_type_id,
                                )?.name || 'None'}
                              </span>
                            ) : (
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
                                    onUpdateSubTask(subtask.id, {
                                      evidence_type_id: value || fallback?.id,
                                    });
                                  }
                                }}
                              >
                                {' '}
                                <SelectTrigger className="h-6 border-none bg-gray-100 hover:bg-gray-200 text-[10px] font-bold text-muted-foreground uppercase tracking-tight py-0 px-2 rounded-md shadow-none w-auto gap-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {evidenceTypes.map((type: any) => (
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
                            )}
                          </div>
                        </div>

                        {!readOnly && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              mode="icon"
                              className="size-9 text-gray-300 hover:text-danger hover:bg-danger/5 opacity-0 group-hover:opacity-100 transition-all rounded-xl"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSubTask(subtask.id);
                              }}
                            >
                              <KeenIcon icon="trash" className="text-lg" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </SortableItem>
                  ))}
                </Sortable>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-5 border-t border-gray-100 flex-shrink-0 bg-gray-50/30 justify-between">
          {!readOnly ? (
            <Fragment>
              <Button
                variant="destructive"
                appearance="light"
                className="h-11 px-6 rounded-xl font-bold"
                onClick={() => task && onDeleteTask(task.id)}
              >
                <KeenIcon icon="trash" />
                Delete Task
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="h-11 px-6 rounded-xl font-bold"
                  onClick={() => onOpenChange(false)}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  className="h-11 px-8 rounded-xl font-bold shadow-lg shadow-primary/20"
                  onClick={handleSaveTask}
                  disabled={
                    isUpdating ||
                    !formData.name.trim() ||
                    !formData.evidence_type_id
                  }
                >
                  {isUpdating ? (
                    <Fragment>
                      <KeenIcon icon="loading" className="animate-spin mr-2" />{' '}
                      Saving...
                    </Fragment>
                  ) : (
                    <Fragment>
                      <KeenIcon icon="check" className="mr-2" /> Save Changes
                    </Fragment>
                  )}
                </Button>
              </div>
            </Fragment>
          ) : (
            <div className="w-full flex justify-end">
              <Button
                variant="outline"
                className="h-11 px-8 rounded-xl font-bold"
                onClick={() => onOpenChange(false)}
              >
                Close Progress View
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
