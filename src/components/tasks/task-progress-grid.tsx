import { Fragment } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { KeenIcon } from '@/components/keenicons';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface TaskProgressGridProps {
  tasks: any[];
  expandedTasks: Set<string>;
  onToggleExpand: (taskId: string) => void;
  onViewDetails: (task: any) => void;
  onToggleTask?: (taskId: string, currentStatus: string) => void;
  onToggleSubTask?: (subtaskId: string, currentStatus: boolean) => void;
  onLinkMeeting?: (taskId: string) => void;
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
  onLinkMeeting,
  readOnly = false,
}: TaskProgressGridProps) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="grid grid-cols-[40px_1fr_200px_140px] gap-4 border-b border-gray-100 bg-gray-50/50 p-4 font-semibold text-gray-700 text-sm">
        <div className="w-10 text-center">Done</div>
        <div>Task Name & Associated Meetings</div>
        <div>Evidence Status</div>
        <div className="text-right">Actions</div>
      </div>

      <div className="divide-y divide-gray-100">
        {tasks.map((task) => (
          <Fragment key={task.id}>
            {/* Main Task Row */}
            <div className="grid grid-cols-[40px_1fr_200px_140px] gap-4 p-4 hover:bg-gray-50/50 transition-colors group">
              <div className="flex items-start justify-center pt-1">
                <button
                  disabled={readOnly}
                  onClick={(e) => {
                    e.preventDefault();
                    onToggleTask?.(task.id, task.status);
                  }}
                  className={cn(
                    "size-6 rounded-md border flex items-center justify-center transition-all",
                    task.status === 'completed' 
                      ? "bg-success border-success text-white" 
                      : "bg-white border-gray-300 hover:border-primary text-transparent",
                    readOnly && "cursor-default"
                  )}
                >
                  <KeenIcon icon="check" className="text-xs" />
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <span className={cn(task.status === 'completed' && "text-gray-400 line-through")}>
                      {task.name}
                    </span>
                    {task.status && (
                      <Badge 
                        className={cn(
                          'text-[9px] font-black uppercase tracking-wider h-4 px-1.5 rounded-full border-none',
                          task.status === 'completed' && 'bg-green-100 text-success',
                          task.status === 'awaiting_review' && 'bg-yellow-100 text-yellow-700',
                          task.status === 'not_submitted' && 'bg-gray-100 text-gray-500'
                        )}
                      >
                        {statusLabels[task.status] || task.status}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Associated Meetings Section */}
                  <div className="flex flex-wrap gap-2 items-center min-h-6">
                    {task.meetings && task.meetings.length > 0 ? (
                      task.meetings.map((meeting: any) => (
                        <div 
                          key={meeting.id} 
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-[10px] font-bold text-blue-600 group/mt relative"
                          title={`Meeting: ${meeting.title} on ${format(new Date(meeting.date_time), 'PPP')}`}
                        >
                          <KeenIcon icon="calendar" className="text-[10px]" />
                          <span className="max-w-[120px] truncate">{meeting.title}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-[10px] text-gray-400 italic">No meetings linked</span>
                    )}
                    
                    {!readOnly && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="xs"
                          className="h-5 px-1.5 text-[9px] font-bold text-primary hover:bg-primary/5 rounded-full border border-primary/10 gap-1"
                          onClick={() => onLinkMeeting?.(task.id)}
                        >
                          <KeenIcon icon="plus" className="text-[8px]" />
                          Link Meeting
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          className="h-5 px-1.5 text-[9px] font-bold text-success hover:bg-success/5 rounded-full border border-success/10 gap-1"
                          onClick={() => onCreateMeeting?.(task.id)}
                        >
                          <KeenIcon icon="calendar" className="text-[8px]" />
                          Add Meeting
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {task.subtasks && task.subtasks.length > 0 && (
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      onToggleExpand(task.id);
                    }}
                    className="text-[10px] font-bold text-primary uppercase flex items-center gap-1"
                  >
                    <KeenIcon icon={expandedTasks.has(task.id) ? "minus-square" : "plus-square"} className="text-xs" />
                    {expandedTasks.has(task.id) ? 'Hide' : 'Show'} {task.subtasks.length} Sub-tasks
                  </button>
                )}
              </div>

              <div className="flex items-start pt-0.5">
                {task.evidence_count > 0 ? (
                  <Badge variant="success" appearance="light" size="sm" className="gap-1.5">
                    <KeenIcon icon="file-done" className="text-[10px]" />
                    {task.evidence_count} Submission{task.evidence_count > 1 ? 's' : ''}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground italic">No evidence yet</span>
                )}
              </div>

              <div className="flex items-start justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs font-bold text-primary hover:bg-primary/5 px-3 rounded-lg h-8"
                  onClick={() => onViewDetails(task)}
                >
                  <KeenIcon icon={readOnly ? "eye" : "cloud-upload"} />
                  {readOnly ? 'View Details' : 'Submit Evidence'}
                </Button>
              </div>
            </div>

            {/* Subtask Rows Container */}
            {expandedTasks.has(task.id) && task.subtasks && task.subtasks.length > 0 && (
              <div className="bg-gray-50/30 border-t border-gray-50">
                {task.subtasks.map((subtask: any) => (
                  <div key={subtask.id} className="grid grid-cols-[40px_1fr_200px_140px] gap-4 py-2.5 px-4 hover:bg-gray-50 transition-colors border-t border-gray-50/50 first:border-t-0">
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
                    <div className="flex items-center">
                      <span className={cn(
                        "text-xs font-medium",
                        subtask.is_completed ? "text-gray-400 line-through" : "text-gray-700"
                      )}>
                        {subtask.name}
                      </span>
                    </div>
                    <div className="flex items-center">
                      {subtask.evidence_count > 0 ? (
                        <span className="text-[10px] text-success font-bold flex items-center gap-1">
                          <KeenIcon icon="check" className="text-[10px]" />
                          Evidence Provided
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">Pending</span>
                      )}
                    </div>
                    <div className="w-10"></div>
                  </div>
                ))}
              </div>
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
