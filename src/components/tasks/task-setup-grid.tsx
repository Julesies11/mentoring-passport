import { Fragment } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { KeenIcon } from '@/components/keenicons';
import {
  Sortable,
  SortableItem,
  SortableItemHandle,
} from '@/components/ui/sortable';

interface TaskSetupGridProps {
  tasks: any[];
  expandedTasks: Set<string>;
  onToggleExpand: (taskId: string) => void;
  onEdit: (task: any) => void;
  onDelete: (taskId: string) => void;
  onReorder: (newOrder: any[]) => void;
  isDeleting?: boolean;
}

export function TaskSetupGrid({
  tasks,
  expandedTasks,
  onToggleExpand,
  onEdit,
  onDelete,
  onReorder,
  isDeleting = false,
}: TaskSetupGridProps) {
  return (
    <div className="w-full min-w-0 overflow-hidden">
      {/* Desktop Header - Hidden on Mobile */}
      <div className="hidden lg:grid grid-cols-[40px_minmax(200px,2fr)_minmax(140px,1fr)_100px] gap-4 border-b border-gray-100 bg-gray-50/50 p-4 font-semibold text-gray-700 text-sm">
        <div className="w-10"></div>
        <div>Task Name</div>
        <div>Evidence Requirement</div>
        <div className="text-right pr-2">Actions</div>
      </div>

      <Sortable
        value={tasks}
        onValueChange={onReorder}
        getItemValue={(item) => item.id}
        className="divide-y divide-gray-100 min-w-0 w-full"
      >
        {tasks.map((task) => (
          <SortableItem key={task.id} value={task.id} className="bg-white">
            <div className="group min-w-0 w-full">
              {/* Desktop Task Row */}
              <div className="hidden lg:grid grid-cols-[40px_minmax(200px,2fr)_minmax(140px,1fr)_100px] gap-4 p-4 hover:bg-gray-50/50 transition-colors border-t border-gray-100 first:border-t-0 items-start">
                <div className="flex items-start justify-center pt-1">
                  <SortableItemHandle>
                    <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-primary transition-colors">
                      <KeenIcon
                        icon="dots-square-vertical"
                        className="text-xl"
                      />
                    </div>
                  </SortableItemHandle>
                </div>

                <div className="space-y-2 min-w-0">
                  <div className="font-bold text-gray-900 text-sm break-words">
                    {task.name}
                  </div>
                  {task.subtasks && task.subtasks.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onToggleExpand(task.id);
                      }}
                      className="text-[10px] font-bold text-primary uppercase flex items-center gap-1"
                    >
                      <KeenIcon
                        icon={
                          expandedTasks.has(task.id)
                            ? 'minus-square'
                            : 'plus-square'
                        }
                        className="text-xs"
                      />
                      {expandedTasks.has(task.id) ? 'Hide' : 'Show'}{' '}
                      {task.subtasks.length} Sub-tasks
                    </button>
                  )}
                </div>

                <div className="flex items-start pt-0.5 min-w-0">
                  {task.evidence_type ? (
                    task.evidence_type.requires_submission ? (
                      <Badge
                        variant="destructive"
                        appearance="light"
                        size="sm"
                        className="gap-1.5 w-fit"
                      >
                        <KeenIcon icon="cloud-upload" className="text-[10px]" />
                        {task.evidence_type.name}
                      </Badge>
                    ) : (
                      <span className="text-xs font-semibold text-gray-600 px-2 flex items-center gap-1.5 leading-normal">
                        <KeenIcon icon="file" className="text-[12px] text-gray-400" />
                        {task.evidence_type.name}
                      </span>
                    )
                  ) : (
                    <span className="text-xs font-medium text-gray-400 italic">
                      None required
                    </span>
                  )}
                </div>

                <div className="flex items-start justify-end gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    mode="icon"
                    className="size-8 rounded-lg hover:bg-primary/5 text-gray-400 hover:text-primary"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onEdit(task);
                    }}
                  >
                    <KeenIcon icon="pencil" className="text-lg" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    mode="icon"
                    className="size-8 rounded-lg hover:bg-danger/5 text-gray-400 hover:text-danger"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDelete(task.id);
                    }}
                    disabled={isDeleting}
                  >
                    <KeenIcon icon="trash" className="text-lg" />
                  </Button>
                </div>
              </div>

              {/* Mobile Task Row */}
              <div className="lg:hidden flex flex-col p-3 gap-3 border-t border-gray-100 first:border-t-0 active:bg-gray-50 transition-colors min-w-0 w-full relative">
                <div className="flex items-start gap-3 pr-20 min-w-0 w-full">
                  <SortableItemHandle>
                    <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-primary transition-colors shrink-0 pt-0.5">
                      <KeenIcon icon="dots-square-vertical" className="text-xl" />
                    </div>
                  </SortableItemHandle>
                  
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="text-sm font-bold text-gray-900 leading-tight">
                      <span className="break-words min-w-0 flex-1 break-all line-clamp-2">{task.name}</span>
                    </div>

                    <div className="flex items-start pt-0.5">
                      {task.evidence_type ? (
                        task.evidence_type.requires_submission ? (
                          <Badge variant="destructive" appearance="light" size="xs" className="gap-1.5 px-1.5 py-0.5 text-[9px] h-auto leading-normal">
                            <KeenIcon icon="cloud-upload" className="text-[9px]" />
                            {task.evidence_type.name}
                          </Badge>
                        ) : (
                          <span className="text-[10px] font-semibold text-gray-600 flex items-center gap-1">
                            <KeenIcon icon="file" className="text-[10px] text-gray-400" />
                            {task.evidence_type.name}
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] font-medium text-gray-400 italic">
                          None required
                        </span>
                      )}
                    </div>
                    
                    {task.subtasks && task.subtasks.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onToggleExpand(task.id);
                        }}
                        className="text-[10px] font-bold text-primary uppercase flex items-center gap-1 pt-1"
                      >
                        <KeenIcon icon={expandedTasks.has(task.id) ? 'minus-square' : 'plus-square'} className="text-xs" />
                        {expandedTasks.has(task.id) ? 'Hide' : 'Show'} {task.subtasks.length} Sub-tasks
                      </button>
                    )}
                  </div>
                </div>

                <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                  <Button variant="secondary" size="sm" mode="icon" className="size-8 p-0 rounded-lg bg-gray-50 border border-gray-100 text-gray-500 hover:text-primary transition-colors shadow-xs" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(task); }}>
                    <KeenIcon icon="pencil" className="text-base" />
                  </Button>
                  <Button variant="secondary" size="sm" mode="icon" className="size-8 p-0 rounded-lg bg-gray-50 border border-gray-100 text-gray-500 hover:text-danger transition-colors shadow-xs" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(task.id); }} disabled={isDeleting}>
                    <KeenIcon icon="trash" className="text-base" />
                  </Button>
                </div>
              </div>

              {/* Subtask Rows Container */}
              {expandedTasks.has(task.id) &&
                task.subtasks &&
                task.subtasks.length > 0 && (
                  <div className="bg-gray-50/30 border-t border-gray-100/50">
                    {task.subtasks.map((subtask: any) => (
                      <div
                        key={subtask.id}
                        className="flex flex-col lg:grid lg:grid-cols-[40px_minmax(200px,2fr)_minmax(140px,1fr)_100px] gap-2 lg:gap-4 py-3 px-4 hover:bg-gray-50 transition-colors border-t border-gray-50/50 first:border-t-0"
                      >
                        <div className="hidden lg:block w-10"></div>
                        <div className="lg:pl-8 flex items-start lg:items-center gap-3 min-w-0">
                          <div className="w-1.5 h-1.5 bg-gray-300 rounded-full flex-shrink-0 mt-1.5 lg:mt-0"></div>
                          <span className="text-xs text-gray-700 font-medium break-words min-w-0 flex-1">
                            {subtask.name}
                          </span>
                        </div>
                        <div className="flex items-center pl-4 lg:pl-0">
                          {subtask.evidence_type ? (
                            subtask.evidence_type.requires_submission ? (
                              <Badge
                                variant="destructive"
                                appearance="light"
                                size="xs"
                                className="gap-1.5 px-1.5"
                              >
                                <KeenIcon
                                  icon="cloud-upload"
                                  className="text-[9px]"
                                />
                                {subtask.evidence_type.name}
                              </Badge>
                            ) : (
                              <span className="text-[10px] lg:text-[11px] text-gray-600 font-medium flex items-center gap-1.5">
                                <KeenIcon icon="file" className="text-[10px] text-gray-400" />
                                {subtask.evidence_type.name}
                              </span>
                            )
                          ) : (
                            <span className="text-[10px] lg:text-[11px] text-gray-400 italic px-1.5">
                              None
                            </span>
                          )}
                        </div>
                        <div className="hidden lg:block w-10"></div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </SortableItem>
        ))}
      </Sortable>
    </div>
  );
}
