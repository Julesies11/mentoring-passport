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
      {/* Desktop Header - Hidden on Mobile */}
      <div className="hidden lg:grid grid-cols-[40px_minmax(200px,2fr)_minmax(140px,1fr)_minmax(160px,1.2fr)_100px] gap-4 border-b border-gray-100 bg-gray-50/50 p-4 font-semibold text-gray-700 text-sm">
        <div className="w-10 text-center">Done</div>
        <div>Task Name</div>
        <div>Evidence Requirement</div>
        <div>Scheduled Meetings</div>
        <div className="text-right">Actions</div>
      </div>

      <div className="p-2 lg:p-4 flex flex-col gap-3 lg:gap-4">
        {tasks.map((task) => (
          <div key={task.id} id={`task-${task.id}`} className="border border-gray-200 rounded-xl lg:rounded-2xl overflow-hidden bg-white shadow-sm hover:border-gray-300 transition-colors scroll-mt-20">
            
            {/* Desktop Version */}
            <div className="hidden lg:grid grid-cols-[40px_minmax(200px,2fr)_minmax(140px,1fr)_minmax(160px,1.2fr)_100px] gap-4 p-5 group bg-white items-start">
              {/* Checkbox */}
              <div className="flex items-start justify-center pt-1">
                <button
                  disabled={readOnly}
                  onClick={(e) => {
                    e.preventDefault();
                    if (task.evidence_type?.requires_submission) {
                      toast.error('Submission Required', { description: 'Please submit evidence through the Edit Task dialog.' });
                      return;
                    }
                    onToggleTask?.(task.id, task.status);
                  }}
                  className={cn(
                    "size-6 rounded-md border flex items-center justify-center transition-all shrink-0",
                    task.status === 'completed' ? "bg-success border-success text-white" : 
                    task.status === 'awaiting_review' ? "bg-yellow-100 border-yellow-300 text-yellow-600" :
                    "bg-white border-gray-300 hover:border-primary text-transparent"
                  )}
                >
                  {task.status === 'awaiting_review' ? <KeenIcon icon="time" className="text-xs" /> : <KeenIcon icon="check" className="text-xs" />}
                </button>
              </div>
              
              {/* Task Name */}
              <div className="flex flex-col gap-2 min-w-0">
                <div className="font-bold text-gray-900 text-sm leading-snug break-words">
                  <span className={cn(task.status === 'completed' && "text-gray-400 line-through")}>{task.name}</span>
                  {task.status === 'awaiting_review' && <Badge className="bg-yellow-100 text-yellow-700 border-none text-[8px] h-4 uppercase font-black px-1.5 ml-2 align-middle">Awaiting Review</Badge>}
                </div>
                {task.status === 'completed' && task.completed_at && (
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                    <KeenIcon icon="check-circle" className="text-success text-[12px]" />
                    <span>Completed by {task.completed_by?.full_name || 'System'} on {format(new Date(task.completed_at), 'MMM d, yyyy')}</span>
                  </div>
                )}
                {task.subtasks && task.subtasks.length > 0 && (
                  <button onClick={() => onToggleExpand(task.id)} className="text-[10px] font-bold text-primary uppercase flex items-center gap-1 hover:underline w-fit">
                    <KeenIcon icon={expandedTasks.has(task.id) ? "minus-square" : "plus-square"} className="text-xs" />
                    {expandedTasks.has(task.id) ? 'Hide' : 'Show'} {task.subtasks.length} Sub-tasks
                  </button>
                )}
              </div>

              {/* Evidence */}
              <div className="flex flex-col gap-2 pt-0.5 min-w-0">
                {task.evidence_type && (
                  <div className="flex flex-col gap-1">
                    {task.evidence_type.requires_submission ? (
                      <Badge variant="destructive" appearance="light" size="sm" className="gap-1.5 w-fit">
                        <KeenIcon icon="cloud-upload" className="text-[10px]" />
                        {task.evidence_type.name}
                      </Badge>
                    ) : (
                      <span className="text-xs font-semibold text-gray-600 px-2 flex items-center gap-1.5 leading-normal">
                        <KeenIcon icon="file" className="text-gray-400 text-[12px]" />
                        {task.evidence_type.name}
                      </span>
                    )}
                  </div>
                )}
                {task.evidence_count > 0 && <div className="flex items-center gap-1.5 text-[10px] font-bold text-success"><KeenIcon icon="file-done" className="text-[12px]" />{task.evidence_count} files uploaded</div>}
              </div>

              {/* Meetings */}
              <div className="flex flex-col gap-1.5 pt-0.5 min-w-0">
                {task.meetings?.map((meeting: any) => (
                  <div key={meeting.id} className="flex flex-col px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <KeenIcon icon="calendar" className="text-primary text-[10px]" />
                      <span className="text-[10px] font-bold text-gray-900 truncate">{meeting.title}</span>
                    </div>
                    <span className="text-[9px] text-muted-foreground uppercase">{format(new Date(meeting.date_time), 'MMM d, p')}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 shrink-0">
                {!readOnly && (
                  <button className="size-9 rounded-xl border border-transparent bg-success-light text-success hover:bg-success hover:text-white transition-all flex items-center justify-center shadow-sm" onClick={() => onCreateMeeting?.(task.id)}>
                    <KeenIcon icon="calendar-add" className="text-lg" />
                  </button>
                )}
                <button className="size-9 rounded-xl border border-transparent bg-primary-light text-primary hover:bg-primary hover:text-white transition-all flex items-center justify-center shadow-sm" onClick={() => onViewDetails(task)}>
                  <KeenIcon icon="pencil" className="text-lg" />
                </button>
              </div>
            </div>

            {/* Mobile Version - Card Layout */}
            <div className="lg:hidden flex flex-col p-4 bg-white gap-4">
              <div className="flex items-start gap-3">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    if (task.evidence_type?.requires_submission) {
                      toast.error('Submission Required', { description: 'Use Edit Task to submit evidence.' });
                      return;
                    }
                    onToggleTask?.(task.id, task.status);
                  }}
                  className={cn(
                    "size-7 rounded-lg border flex items-center justify-center transition-all shrink-0",
                    task.status === 'completed' ? "bg-success border-success text-white" : 
                    task.status === 'awaiting_review' ? "bg-yellow-100 border-yellow-300 text-yellow-600" :
                    "bg-white border-gray-300 text-transparent"
                  )}
                >
                  {task.status === 'awaiting_review' ? <KeenIcon icon="time" className="text-xs" /> : <KeenIcon icon="check" className="text-xs" />}
                </button>
                <div className="flex-1 min-w-0">
                  <h3 className={cn("text-sm font-bold text-gray-900 leading-tight", task.status === 'completed' && "text-gray-400 line-through")}>
                    {task.name}
                  </h3>
                  {task.status === 'completed' && task.completed_at && (
                    <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                      Completed {format(new Date(task.completed_at), 'MMM d')}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-y border-gray-50 py-3">
                {task.evidence_type && (
                  <div className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold",
                    task.evidence_type.requires_submission ? "bg-danger/5 text-danger" : "bg-gray-50 text-gray-600"
                  )}>
                    <KeenIcon icon={task.evidence_type.requires_submission ? "cloud-upload" : "file"} className="text-xs" />
                    {task.evidence_type.name}
                  </div>
                )}
                {task.evidence_count > 0 && (
                  <div className="bg-success/5 text-success flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold">
                    <KeenIcon icon="file-done" className="text-xs" />
                    {task.evidence_count} file{task.evidence_count > 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {task.meetings && task.meetings.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest px-1">Scheduled Meetings</p>
                  <div className="flex flex-col gap-2">
                    {task.meetings.map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="flex items-center gap-2 truncate">
                          <KeenIcon icon="calendar" className="text-primary text-xs" />
                          <span className="text-[11px] font-bold text-gray-700 truncate">{m.title}</span>
                        </div>
                        <span className="text-[10px] font-medium text-gray-500 shrink-0">{format(new Date(m.date_time), 'MMM d, p')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button className="flex-1 rounded-xl h-11 font-bold text-xs gap-2 shadow-sm" onClick={() => onViewDetails(task)}>
                  <KeenIcon icon="pencil" className="text-sm" />
                  Edit Task
                </Button>
                {!readOnly && (
                  <Button variant="outline" className="size-11 p-0 rounded-xl border-success/30 bg-success-light text-success shrink-0 shadow-sm" onClick={() => onCreateMeeting?.(task.id)}>
                    <KeenIcon icon="calendar-add" className="text-xl" />
                  </Button>
                )}
              </div>

              {task.subtasks && task.subtasks.length > 0 && (
                <button onClick={() => onToggleExpand(task.id)} className="w-full py-2 border-t border-gray-50 mt-1 text-[10px] font-bold text-primary uppercase flex items-center justify-center gap-2">
                  <KeenIcon icon={expandedTasks.has(task.id) ? "minus-square" : "plus-square"} />
                  {expandedTasks.has(task.id) ? 'Hide' : 'View'} {task.subtasks.length} Sub-tasks
                </button>
              )}
            </div>

            {/* Subtask Rows */}
            {expandedTasks.has(task.id) && task.subtasks && task.subtasks.length > 0 && (
              <div className="border-t border-gray-100 bg-gray-50/20 divide-y divide-gray-100/50">
                {task.subtasks.map((st: any) => (
                  <div key={st.id} className="flex items-start gap-3 py-3.5 px-4 lg:px-5 lg:ml-10 lg:border-l-2 lg:border-l-primary/20">
                    <button
                      disabled={readOnly}
                      onClick={() => onToggleSubTask?.(st.id, st.is_completed)}
                      className={cn("size-5 rounded border flex items-center justify-center transition-all shrink-0 mt-0.5",
                        st.is_completed ? "bg-success border-success text-white" : "bg-white border-gray-200"
                      )}
                    >
                      <KeenIcon icon="check" className="text-[10px]" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs font-medium leading-normal break-words", st.is_completed && "text-gray-400 line-through")}>{st.name}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        {st.evidence_type && (
                          <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                            <KeenIcon icon="file" className="text-[10px]" />
                            {st.evidence_type.name}
                          </span>
                        )}
                        {st.is_completed && st.completed_at && (
                          <span className="text-[9px] text-muted-foreground font-medium flex items-center gap-1">
                            <KeenIcon icon="check-circle" className="text-success text-[10px]" />
                            {format(new Date(st.completed_at), 'MMM d')}
                          </span>
                        )}
                      </div>
                    </div>
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
