import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useUserPairs } from '@/hooks/use-pairs';
import { usePairTasks } from '@/hooks/use-tasks';
import { useAllMeetings } from '@/hooks/use-meetings';
import { createEvidence, uploadEvidenceFile, fetchPairEvidence } from '@/lib/api/evidence';
import { updateMeeting } from '@/lib/api/meetings';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KeenIcon } from '@/components/keenicons';
import { TaskDialog } from '@/components/tasks/task-dialog';
import { toast } from 'sonner';
import { TaskProgressGrid } from '@/components/tasks/task-progress-grid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export function ChecklistContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: pairs = [], isLoading: pairsLoading } = useUserPairs(user?.id || '');
  const activePair = pairs.find(p => p.status === 'active');
  
  const { tasks, stats, isLoading: tasksLoading, updateStatus, updateSubTask } = usePairTasks(activePair?.id || '');

  const { data: pairEvidence = [] } = useQuery({
    queryKey: ['pair-evidence', activePair?.id],
    queryFn: () => fetchPairEvidence(activePair?.id || ''),
    enabled: !!activePair?.id,
  });

  const { meetings = [] } = useAllMeetings();
  const pairMeetings = useMemo(() => 
    meetings.filter(m => m.pair_id === activePair?.id),
    [meetings, activePair?.id]
  );

  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Meeting Linking State
  const [isLinkMeetingOpen, setIsLinkMeetingOpen] = useState(false);
  const [linkingTaskId, setLinkingTaskId] = useState<string | null>(null);

  // Link Meeting Mutation
  const linkMeetingMutation = useMutation({
    mutationFn: ({ meetingId, pairTaskId }: { meetingId: string; pairTaskId: string | null }) =>
      updateMeeting(meetingId, { pair_task_id: pairTaskId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-meetings'] });
      toast.success('Meeting linked to task successfully');
      setIsLinkMeetingOpen(false);
    },
    onError: () => {
      toast.error('Failed to link meeting');
    }
  });

  // Automatically expand all tasks by default
  useEffect(() => {
    if (tasks && tasks.length > 0) {
      setExpandedTasks(new Set(tasks.map(task => task.id)));
    }
  }, [tasks]);

  // Enrich tasks with evidence counts AND associated meetings
  const enrichedTasks = useMemo(() => {
    if (!tasks) return [];
    
    return tasks.map(task => {
      const taskEvidence = pairEvidence.filter(e => e.pair_task_id === task.id);
      const taskMeetings = pairMeetings.filter(m => m.pair_task_id === task.id);
      
      const enrichedSubtasks = task.subtasks?.map(st => {
        const subtaskEvidence = pairEvidence.filter(e => e.pair_subtask_id === st.id);
        return {
          ...st,
          evidence_count: subtaskEvidence.length,
          evidence: subtaskEvidence
        };
      });

      return {
        ...task,
        evidence_count: taskEvidence.length,
        evidence: taskEvidence,
        meetings: taskMeetings,
        subtasks: enrichedSubtasks
      };
    });
  }, [tasks, pairEvidence, pairMeetings]);

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

  const handleViewDetails = (task: any) => {
    setSelectedTask(task);
    setIsTaskDialogOpen(true);
  };

  const handleLinkMeeting = (taskId: string) => {
    setLinkingTaskId(taskId);
    setIsLinkMeetingOpen(true);
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'not_submitted' : 'completed';
    try {
      updateStatus(taskId, newStatus);
      toast.success(`Task ${newStatus === 'completed' ? 'completed' : 'reset'}`);
    } catch (error) {
      toast.error('Failed to update task status');
    }
  };

  const handleToggleSubTask = async (subtaskId: string, currentStatus: boolean) => {
    try {
      updateSubTask(subtaskId, { is_completed: !currentStatus });
      toast.success(`Sub-task ${!currentStatus ? 'completed' : 'reset'}`);
    } catch (error) {
      toast.error('Failed to update sub-task status');
    }
  };

  const handleSubmitEvidence = async (taskId: string, evidenceData: { description: string; file?: File }) => {
    if (!activePair) return;
    
    setIsSubmitting(true);
    try {
      let fileUrl = '';
      if (evidenceData.file) {
        fileUrl = await uploadEvidenceFile(evidenceData.file, activePair.id);
      }

      await createEvidence({
        pair_id: activePair.id,
        pair_task_id: taskId,
        evidence_type_id: selectedTask?.evidence_type_id,
        file_url: fileUrl,
        description: evidenceData.description
      });

      // Update status to awaiting review
      updateStatus(taskId, 'awaiting_review');
      
      setIsTaskDialogOpen(false);
      toast.success('Evidence submitted successfully');
    } catch (error) {
      console.error('Error submitting evidence:', error);
      toast.error('Failed to submit evidence');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (pairsLoading || tasksLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <KeenIcon icon="loading" className="animate-spin mb-2 text-2xl" />
        <p>Loading checklist...</p>
      </div>
    );
  }

  if (!activePair) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <KeenIcon icon="information-2" className="text-4xl text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2 text-gray-900">No Active Pairing</h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            You haven't been paired with a mentor yet. Please contact your supervisor to begin your mentoring journey.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-5 lg:gap-7.5">
      {stats && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground uppercase mb-1">My Journey Progress</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-gray-900">{stats.completion_percentage}%</p>
                  <span className="text-sm text-muted-foreground">
                    ({stats.completed} of {stats.total} items completed)
                  </span>
                </div>
              </div>
            </div>
            <Progress value={stats.completion_percentage} className="h-2.5" />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Mentoring Tasks</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <TaskProgressGrid
            tasks={enrichedTasks}
            expandedTasks={expandedTasks}
            onToggleExpand={handleToggleExpand}
            onViewDetails={handleViewDetails}
            onToggleTask={handleToggleTask}
            onToggleSubTask={handleToggleSubTask}
            onCreateMeeting={handleLinkMeeting}
          />
        </CardContent>
      </Card>

      {/* Link Meeting Dialog */}
      <Dialog open={isLinkMeetingOpen} onOpenChange={setIsLinkMeetingOpen}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Link Meeting to Task</DialogTitle>
            <DialogDescription>
              Select a meeting to associate with this task. This helps track which meeting the task was discussed in.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {pairMeetings.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <p className="text-sm text-muted-foreground">No meetings found for your pairing.</p>
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                {pairMeetings.map((meeting) => (
                  <button
                    key={meeting.id}
                    onClick={() => linkMeetingMutation.mutate({ meetingId: meeting.id, pairTaskId: linkingTaskId })}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group",
                      meeting.pair_task_id === linkingTaskId
                        ? "bg-primary/5 border-primary"
                        : "bg-white border-gray-100 hover:border-primary/30"
                    )}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900">{meeting.title}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(meeting.date_time), 'PPP p')}
                      </span>
                    </div>
                    {meeting.pair_task_id === linkingTaskId ? (
                      <Badge variant="success" size="xs">Linked</Badge>
                    ) : (
                      <KeenIcon icon="plus" className="text-gray-300 group-hover:text-primary transition-colors" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLinkMeetingOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Dialog */}
      {selectedTask && (
        <TaskDialog
          open={isTaskDialogOpen}
          onOpenChange={setIsTaskDialogOpen}
          task={{
            id: selectedTask.id,
            name: selectedTask.name,
            status: selectedTask.status,
            description: selectedTask.task?.description || '',
            evidence_type: selectedTask.evidence_type,
            completed_at: selectedTask.completed_at,
          }}
          pairId={activePair?.id || ''}
          onSubmitEvidence={handleSubmitEvidence}
          onUpdateStatus={handleToggleTask}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
