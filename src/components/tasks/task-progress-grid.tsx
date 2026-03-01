import { Fragment } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { KeenIcon } from '@/components/keenicons';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface TaskProgressGridProps {
  tasks: any[];
  expandedTasks: Set<string>;
  onToggleExpand: (taskId: string) => void;
  onViewDetails: (task: any) => void;
  onToggleTask?: (taskId: string, currentStatus: string) => void;
  onToggleSubTask?: (subtaskId: string, currentStatus: boolean) => void;
  onCreateMeeting?: (taskId: string) => void;
  readOnly?: boolean;
}

const statusLabels: Record<string, string> = {
  not_submitted: 'Not Started',
  awaiting_review: 'Awaiting Review',
  completed: 'Completed',
};

export function TaskProgressGrid({
  tasks,
  expandedTasks,
  onToggleExpand,
  onViewDetails,
  onToggleTask,
  onToggleSubTask,
  onCreateMeeting,
  readOnly = false,
}: TaskProgressGridProps) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="grid grid-cols-[40px_minmax(200px,2fr)_minmax(140px,1fr)_minmax(160px,1.2fr)_100px] gap-4 border-b border-gray-100 bg-gray-50/50 p-4 font-semibold text-gray-700 text-sm">
        <div className="w-10 text-center">Done</div>
        <div>Task Name</div>
        <div>Evidence Requirement</div>
        <div>Scheduled Meetings</div>
        <div className="text-right">Actions</div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {tasks.map((task) => (
          <div key={task.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm hover:border-gray-300 transition-colors">
            {/* Main Task Row */}
            <div className="grid grid-cols-[40px_minmax(200px,2fr)_minmax(140px,1fr)_minmax(160px,1.2fr)_100px] gap-4 p-5 group bg-white items-start">
              {/* Done Checkbox Column */}
              <div className="flex items-start justify-center pt-1">
                <button
                  disabled={readOnly}
                  onClick={(e) => {
                    e.preventDefault();
                    if (task.evidence_type?.requires_submission) {
                      toast.error('Submission Required', {
                        description: 'Please submit evidence through the Edit Task dialog to complete this task.',
                        className: 'bg-danger text-white border-none',
                      });
                      return;
                    }
                    if (onToggleTask) {
                      onToggleTask(task.id, task.status);
                    }
                  }}
                  className={cn(
                    "size-6 rounded-md border flex items-center justify-center transition-all shrink-0",
                    task.status === 'completed' 
                      ? "bg-success border-success text-white" 
                      : task.status === 'awaiting_review'
                        ? "bg-yellow-100 border-yellow-300 text-yellow-600"
                        : "bg-white border-gray-300 hover:border-primary text-transparent",
                    readOnly && "cursor-default opacity-80"
                  )}
                  title={task.evidence_type?.requires_submission ? "This task requires evidence submission" : ""}
                >
                  {task.status === 'awaiting_review' ? (
                    <KeenIcon icon="time" className="text-xs" />
                  ) : (
                    <KeenIcon icon="check" className="text-xs" />
                  )}
                </button>
              </div>
              
              {/* Task Name Column */}
              <div className="flex flex-col gap-2 min-w-0">
                <div className="font-bold text-gray-900 text-sm leading-snug break-words">
                  <span className={cn(task.status === 'completed' && "text-gray-400 line-through")}>
                    {task.name}
                  </span>
                  {task.status === 'awaiting_review' && (
                    <Badge className="bg-yellow-100 text-yellow-700 border-none text-[8px] h-4 uppercase font-black px-1.5 ml-2 align-middle">
                      Awaiting Review
                    </Badge>
                  )}
                </div>

                {task.status === 'completed' && task.completed_at && (
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                    <KeenIcon icon="check-circle" className="text-success text-[12px]" />
                    <span>Completed by {task.completed_by?.full_name || 'System'} on {format(new Date(task.completed_at), 'MMM d, yyyy')}</span>
                  </div>
                )}

                {task.subtasks && task.subtasks.length > 0 && (
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      onToggleExpand(task.id);
                    }}
                    className="text-[10px] font-bold text-primary uppercase flex items-center gap-1 hover:underline w-fit"
                  >
                    <KeenIcon icon={expandedTasks.has(task.id) ? "minus-square" : "plus-square"} className="text-xs" />
                    {expandedTasks.has(task.id) ? 'Hide' : 'Show'} {task.subtasks.length} Sub-tasks
                  </button>
                )}
              </div>

              {/* Evidence Requirement Column */}
              <div className="flex flex-col gap-2 pt-0.5 min-w-0">
                {task.evidence_type && (
                  <div className="flex flex-col gap-1">
                    {task.evidence_type.requires_submission ? (
                      <Badge variant="destructive" appearance="light" size="sm" className="gap-1.5 w-fit">
                        <KeenIcon icon="cloud-upload" className="text-[10px]" />
                        {task.evidence_type.name}
                      </Badge>
                    ) : (
                      <span className="text-xs font-semibold text-gray-600 px-2 flex items-center gap-1.5">
                        <KeenIcon icon="file" className="text-gray-400 text-[12px]" />
                        {task.evidence_type.name}
                      </span>
                    )}
                  </div>
                )}
                
                {task.evidence_count > 0 && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-success">
                    <KeenIcon icon="file-done" className="text-[12px]" />
                    {task.evidence_count} file{task.evidence_count > 1 ? 's' : ''} uploaded
                  </div>
                )}
              </div>

              {/* Scheduled Meetings Column */}
              <div className="flex flex-col gap-1.5 pt-0.5 min-w-0">
                {task.meetings && task.meetings.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {task.meetings.map((meeting: any) => (
                      <div 
                        key={meeting.id} 
                        className="flex flex-col px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 hover:border-primary/20 transition-colors"
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <KeenIcon icon="calendar" className="text-primary text-[10px]" />
                          <span className="text-[10px] font-bold text-gray-900 truncate" title={meeting.title}>{meeting.title}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-muted-foreground font-medium uppercase">
                            {format(new Date(meeting.date_time), 'MMM d, p')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-gray-400 italic px-1 flex items-center gap-1.5">
                    <KeenIcon icon="calendar" className="text-gray-300" />
                    No meetings
                  </div>
                )}
              </div>

              {/* Actions Column */}
              <div className="flex items-center justify-end gap-2 shrink-0">
                {!readOnly && (
                  <button
                    className="size-9 rounded-xl border border-transparent bg-success-light text-success hover:bg-success hover:text-white transition-all flex items-center justify-center shadow-sm"
                    onClick={() => onCreateMeeting?.(task.id)}
                    title="Schedule Meeting"
                  >
                    <KeenIcon icon="calendar-add" className="text-lg" />
                  </button>
                )}
                <button
                  className="size-9 rounded-xl border border-transparent bg-primary-light text-primary hover:bg-primary hover:text-white transition-all flex items-center justify-center shadow-sm"
                  onClick={() => onViewDetails(task)}
                  title="Edit Task & Evidence"
                >
                  <KeenIcon icon="pencil" className="text-lg" />
                </button>
              </div>
            </div>

            {/* Subtask Rows Container */}
            {expandedTasks.has(task.id) && task.subtasks && task.subtasks.length > 0 && (
              <div className="border-t border-gray-100 bg-gray-50/20">
                {task.subtasks.map((subtask: any) => (
                  <div key={subtask.id} className="grid grid-cols-[40px_minmax(200px,2fr)_minmax(140px,1fr)_minmax(160px,1.2fr)_100px] gap-4 py-3 px-5 hover:bg-gray-50 transition-colors border-t border-gray-100/50 first:border-t-0 ml-10 border-l-2 border-l-primary/20 text-sm items-start">
                    <div className="flex items-center justify-center">
                      <button
                        disabled={readOnly}
                        onClick={(e) => {
                          e.preventDefault();
                          onToggleSubTask?.(subtask.id, subtask.is_completed);
                        }}
                        className={cn(
                          "size-5 rounded border flex items-center justify-center transition-all",
                          subtask.is_completed 
                            ? "bg-success border-success text-white" 
                            : "bg-white border-gray-200 hover:border-primary text-transparent",
                          readOnly && "cursor-default"
                        )}
                      >
                        <KeenIcon icon="check" className="text-[10px]" />
                      </button>
                    </div>
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className={cn(
                        "text-xs font-medium leading-normal break-words",
                        subtask.is_completed ? "text-gray-400 line-through" : "text-gray-700"
                      )}>
                        {subtask.name}
                      </span>
                      {subtask.is_completed && subtask.completed_at && (
                        <span className="text-[9px] text-muted-foreground font-medium flex items-center gap-1">
                          <KeenIcon icon="check-circle" className="text-success text-[10px]" />
                          {subtask.completed_by?.full_name || 'System'}, {format(new Date(subtask.completed_at), 'MMM d')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-start">
                      {subtask.evidence_type && (
                        subtask.evidence_type.requires_submission ? (
                          <Badge variant="destructive" appearance="light" size="xs" className="gap-1 px-1.5 h-auto py-0.5">
                            <KeenIcon icon="cloud-upload" className="text-[9px]" />
                            {subtask.evidence_type.name}
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-gray-600 font-medium px-1.5 flex items-center gap-1.5">
                            <KeenIcon icon="file" className="text-gray-400 text-[10px]" />
                            {subtask.evidence_type.name}
                          </span>
                        )
                      )}
                    </div>
                    <div className="col-span-2"></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
