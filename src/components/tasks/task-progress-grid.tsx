import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { KeenIcon } from '@/components/keenicons';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { getFileIcon } from '@/lib/helpers';

interface TaskProgressGridProps {
  tasks: any[];
  expandedTasks: Set<string>;
  onToggleExpand: (taskId: string) => void;
  onViewDetails: (task: any) => void;
  onToggleTask?: (taskId: string, currentStatus: string) => void;
  onToggleSubTask?: (subtaskId: string, currentStatus: boolean) => void;
  onCreateMeeting?: (taskId: string) => void;
  onEditMeeting?: (meeting: any) => void;
  readOnly?: boolean;
}

export function TaskProgressGrid({
  tasks,
  onViewDetails,
  onToggleTask,
  onToggleSubTask,
  onCreateMeeting,
  onEditMeeting,
  readOnly = false,
}: TaskProgressGridProps) {
  return (
    <div className="w-full min-w-0 overflow-hidden">
      {/* Desktop Header - Hidden on Mobile */}
      <div className="hidden lg:grid grid-cols-[40px_minmax(200px,2fr)_minmax(140px,1fr)_minmax(160px,1.2fr)_100px] gap-4 border-b border-gray-100 bg-gray-50/50 p-4 font-semibold text-gray-700 text-sm">
        <div className="w-10 text-center">Done</div>
        <div>Task Name</div>
        <div>Evidence Requirement</div>
        <div>Scheduled Meetings</div>
        <div className="text-right">Actions</div>
      </div>

      <div className="lg:p-4 flex flex-col gap-3 lg:gap-4 min-w-0 w-full">
        {tasks.map((task) => {
          const isRevision = task.status === 'revision_required';
          
          return (
            <div 
              key={task.id} 
              id={`task-${task.id}`} 
              className={cn(
                "border rounded-xl lg:rounded-2xl overflow-hidden bg-white shadow-sm transition-all scroll-mt-20 min-w-0 w-full",
                isRevision ? "border-red-300 ring-1 ring-red-100 shadow-md shadow-red-50" : "border-gray-200 hover:border-gray-300"
              )}
            >
              {/* Desktop Version */}
              <div className="hidden lg:grid grid-cols-[40px_minmax(200px,2fr)_minmax(140px,1fr)_minmax(160px,1.2fr)_100px] gap-4 p-5 group bg-white items-start">
                {/* Checkbox */}
                <div className="flex items-start justify-center pt-1">
                  <button
                    disabled={readOnly}
                    onClick={(e) => {
                      e.preventDefault();
                      if (task.status === 'awaiting_review') return;
                      if (task.status === 'revision_required' || (task.status !== 'completed' && task.evidence_type?.requires_submission)) {
                        onViewDetails(task);
                        return;
                      }
                      onToggleTask?.(task.id, task.status);
                    }}
                    className={cn(
                      "size-6 rounded-md border flex items-center justify-center transition-all shrink-0",
                      task.status === 'completed' ? "bg-success border-success text-white" : 
                      task.status === 'awaiting_review' ? "bg-yellow-100 border-yellow-300 text-yellow-600" :
                      task.status === 'revision_required' ? "bg-red-50 border-red-200 text-red-600" :
                      "bg-white border-gray-300 hover:border-primary text-transparent"
                    )}
                  >
                    {task.status === 'awaiting_review' ? <KeenIcon icon="time" className="text-xs" /> : 
                     task.status === 'revision_required' ? <KeenIcon icon="information-2" className="text-xs" /> :
                     <KeenIcon icon="check" className="text-xs" />}
                  </button>
                </div>
                
                {/* Task Name */}
                <div className="flex flex-col gap-2 min-w-0">
                  <div className="font-bold text-gray-900 text-sm leading-snug break-words">
                    <span className={cn(task.status === 'completed' && "text-gray-400 line-through")}>{task.name}</span>
                    {task.status === 'awaiting_review' && <Badge className="bg-yellow-100 text-yellow-700 border-none text-[8px] h-4 uppercase font-black px-1.5 ml-2 align-middle">Awaiting Review</Badge>}
                    {isRevision && <Badge className="bg-red-100 text-red-700 border-none text-[7px] h-3.5 uppercase font-black px-1 ml-1.5 align-middle animate-pulse">Revision Required</Badge>}
                  </div>
                  {task.status === 'completed' && task.completed_at && (
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                      <KeenIcon icon="check-circle" className="text-success text-[12px]" />
                      <span>Completed by {task.completed_by?.full_name || 'System'} on {format(new Date(task.completed_at), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  {isRevision && task.last_feedback && (
                    <div className="bg-red-50/50 border border-red-100 p-3 rounded-xl mt-1 space-y-1">
                      <p className="text-[9px] font-black text-red-700 uppercase tracking-widest leading-none">Supervisor Feedback</p>
                      <p className="text-xs text-red-800 font-medium leading-relaxed italic">"{task.last_feedback}"</p>
                    </div>
                  )}
                </div>

                {/* Evidence Column - Desktop Only */}
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
                </div>

                {/* Meetings Column - Desktop Only */}
                <div className="flex flex-col gap-1.5 pt-0.5 min-w-0">
                  {task.meetings?.map((meeting: any) => (
                    <div 
                      key={meeting.id} 
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditMeeting?.(meeting);
                      }}
                      className={cn("flex flex-col px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 transition-colors", onEditMeeting && !readOnly && "cursor-pointer hover:border-primary/50 hover:bg-primary/5 group")}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <KeenIcon icon="calendar" className="text-primary text-[10px]" />
                        <span className={cn("text-[10px] font-bold text-gray-900 truncate", onEditMeeting && !readOnly && "group-hover:text-primary")}>{meeting.title}</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground uppercase">{format(new Date(meeting.date_time), 'MMM d, p')}</span>
                    </div>
                  ))}
                </div>

                {/* Actions Column - Desktop Only */}
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
              <div 
                className="lg:hidden flex flex-col p-3 bg-white gap-3 relative cursor-pointer active:bg-gray-50 transition-colors min-w-0 w-full overflow-hidden"
                onClick={() => onViewDetails(task)}
              >
                <div className="flex items-start gap-3 pr-20 min-w-0 w-full">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (task.status === 'awaiting_review') return;
                      if (task.status === 'revision_required' || (task.status !== 'completed' && task.evidence_type?.requires_submission)) {
                        onViewDetails(task);
                        return;
                      }
                      onToggleTask?.(task.id, task.status);
                    }}
                    className={cn(
                      "size-7 rounded-lg border flex items-center justify-center transition-all shrink-0",
                      task.status === 'completed' ? "bg-success border-success text-white" : 
                      task.status === 'awaiting_review' ? "bg-yellow-100 border-yellow-300 text-yellow-600" :
                      task.status === 'revision_required' ? "bg-red-50 border-red-200 text-red-600" :
                      "bg-white border-gray-300 text-transparent"
                    )}
                  >
                    {task.status === 'awaiting_review' ? <KeenIcon icon="time" className="text-xs" /> : 
                     task.status === 'revision_required' ? <KeenIcon icon="information-2" className="text-xs" /> :
                     <KeenIcon icon="check" className="text-xs" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={cn("text-sm font-bold text-gray-900 leading-tight flex flex-wrap items-center gap-x-1.5 gap-y-1", task.status === 'completed' && "text-gray-400 line-through")}>
                      <span className="break-words min-w-0 flex-1 break-all line-clamp-2">{task.name}</span>
                      {isRevision && <Badge className="bg-red-100 text-red-700 border-none text-[6px] h-3 uppercase font-black px-1 align-middle shrink-0">Revision Required</Badge>}
                    </div>
                    
                    {task.evidence_type && (
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                        <span className="shrink-0">Required:</span>
                        {task.evidence_type.requires_submission ? (
                          <Badge variant="destructive" appearance="light" className="text-[9px] h-4.5 px-1.5 gap-1 font-bold">
                            <KeenIcon icon="cloud-upload" className="text-[10px]" />
                            {task.evidence_type.name}
                          </Badge>
                        ) : (
                          <span className="flex items-center gap-1 truncate">
                            <KeenIcon icon="file" className="text-[10px] shrink-0" />
                            <span className="truncate">{task.evidence_type.name}</span>
                          </span>
                        )}
                      </div>
                    )}

                    {isRevision && task.last_feedback && (
                      <div className="bg-red-50 border border-red-100 p-2.5 rounded-xl mt-2">
                        <p className="text-[8px] font-black text-red-700 uppercase tracking-widest mb-1">Feedback</p>
                        <p className="text-[11px] text-red-800 font-medium italic leading-snug break-words">"{task.last_feedback}"</p>
                      </div>
                    )}
                    {task.status === 'completed' && task.completed_at && (
                      <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                        Completed {format(new Date(task.completed_at), 'MMM d')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Top-Right Action Buttons */}
                <div className="absolute top-2.5 right-2.5 flex gap-1">
                  {!readOnly && (
                    <Button 
                      variant="outline" 
                      className="size-8 p-0 rounded-lg border-success/20 bg-success-light text-success shadow-xs" 
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateMeeting?.(task.id);
                      }}
                    >
                      <KeenIcon icon="calendar-add" className="text-base" />
                    </Button>
                  )}
                  <Button 
                    variant="secondary" 
                    className="size-8 p-0 rounded-lg bg-gray-50 border border-gray-100 text-gray-500 hover:text-primary transition-colors shadow-xs" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetails(task);
                    }}
                  >
                    <KeenIcon icon="pencil" className="text-base" />
                  </Button>
                </div>
              </div>

              {/* Subtask Rows - Visible for both Desktop and Mobile */}
              {task.subtasks && task.subtasks.length > 0 && (
                <div className="border-t border-gray-100 bg-gray-50/20 divide-y divide-gray-100/50">
                  {task.subtasks.map((st: any) => (
                    <div 
                      key={st.id} 
                      className="flex items-start gap-3 py-3 px-4 lg:py-3.5 lg:px-5 lg:ml-10 lg:border-l-2 lg:border-l-primary/20 cursor-pointer active:bg-gray-100/50 transition-colors"
                      onClick={() => onToggleSubTask?.(st.id, st.is_completed)}
                    >
                      <button
                        disabled={readOnly}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSubTask?.(st.id, st.is_completed);
                        }}
                        className={cn("size-5 rounded border flex items-center justify-center transition-all shrink-0 mt-0.5",
                          st.is_completed ? "bg-success border-success text-white" : "bg-white border-gray-200"
                        )}
                      >
                        <KeenIcon icon="check" className="text-[10px]" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs font-medium leading-normal break-words", st.is_completed && "text-gray-400 line-through")}>{st.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          {st.evidence_type && (
                            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 truncate">
                              <KeenIcon icon="file" className="text-[10px] shrink-0" />
                              <span className="truncate">{st.evidence_type.name}</span>
                            </span>
                          )}
                          {st.is_completed && st.completed_at && (
                            <span className="text-[9px] text-muted-foreground font-medium flex items-center gap-1 shrink-0">
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

              {/* Attachments & Meetings Section (Bottom of card) */}
              {(task.evidence_count > 0 || (task.meetings && task.meetings.length > 0)) && (
                <div className="border-t border-gray-100 pt-3 px-3 pb-3 lg:pt-4 lg:px-10 lg:pb-5 space-y-3 lg:space-y-4 bg-gray-50/10">
                  {/* Evidence Files */}
                  {task.evidence_count > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest lg:ml-1">Uploaded Evidence</p>
                      <div className="flex flex-wrap gap-2">
                        {task.evidence?.map((evidence: any) => (
                          evidence.file_url ? (
                            <a 
                              key={evidence.id}
                              href={evidence.file_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-100 hover:bg-primary/5 hover:border-primary/20 transition-all group max-w-full"
                            >
                              <div className="size-4 shrink-0">
                                <img src={getFileIcon(evidence.file_name)} alt="icon" className="size-full" />
                              </div>
                              <span className="text-[10px] font-bold text-gray-700 group-hover:text-primary truncate max-w-[120px] sm:max-w-[150px]">{evidence.file_name || 'View File'}</span>
                              <KeenIcon icon="cloud-download" className="text-gray-400 group-hover:text-primary text-[10px] ml-1 shrink-0" />
                            </a>
                          ) : (
                            <div 
                              key={evidence.id}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-100 max-w-full opacity-70"
                            >
                              <div className="size-4 shrink-0 grayscale">
                                <img src={getFileIcon(evidence.file_name)} alt="icon" className="size-full" />
                              </div>
                              <span className="text-[10px] font-bold text-gray-500 truncate max-w-[120px] sm:max-w-[150px] line-through">{evidence.file_name || 'Unknown File'}</span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Meetings (Mobile View Only) */}
                  <div className="lg:hidden">
                    {task.meetings && task.meetings.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Scheduled Meetings</p>
                        <div className="flex flex-col gap-1.5">
                          {task.meetings.map((m: any) => (
                            <div 
                              key={m.id} 
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditMeeting?.(m);
                              }}
                              className={cn("flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-100 gap-2 transition-colors", onEditMeeting && !readOnly && "cursor-pointer active:bg-gray-100 hover:border-primary/50 group")}
                            >
                              <div className="flex items-center gap-1.5 truncate min-w-0">
                                <KeenIcon icon="calendar" className="text-primary text-[10px] shrink-0" />
                                <span className={cn("text-[10px] font-bold text-gray-700 truncate", onEditMeeting && !readOnly && "group-hover:text-primary")}>{m.title}</span>
                              </div>
                              <span className="text-[9px] font-medium text-gray-500 shrink-0">{format(new Date(m.date_time), 'MMM d, p')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
