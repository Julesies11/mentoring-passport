import { Fragment, useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { usePairTasks } from '@/hooks/use-tasks';
import { useAllMeetings } from '@/hooks/use-meetings';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { KeenIcon } from '@/components/keenicons';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { TaskProgressGrid } from '@/components/tasks/task-progress-grid';
import { TaskDialog } from '@/components/tasks/task-dialog';
import { MeetingDialog } from '@/components/meetings/meeting-dialog';
import { PairingSelector } from '@/components/common/pairing-selector';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPairEvidence, uploadEvidenceFile, createEvidence } from '@/lib/api/evidence';
import { updateMeeting } from '@/lib/api/meetings';
import { toast } from 'sonner';
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
import { usePairing } from '@/providers/pairing-provider';

export function TasksPage() {
  const { user, isMentor } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedPairing: selectedPair, isLoading: pairsLoading } = usePairing();
  
  const { tasks, stats, isLoading: tasksLoading, updateStatus, updateSubTask } = usePairTasks(selectedPair?.id || '');

  const { data: pairEvidence = [] } = useQuery({
    queryKey: ['pair-evidence', selectedPair?.id],
    queryFn: () => fetchPairEvidence(selectedPair?.id || ''),
    enabled: !!selectedPair?.id,
  });

  const { meetings = [], createMeeting, isCreating } = useAllMeetings();
  const pairMeetings = useMemo(() => 
    meetings.filter(m => m.pair_id === selectedPair?.id),
    [meetings, selectedPair?.id]
  );

  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);

  // Meeting Dialog State
  const [isMeetingDialogOpen, setIsMeetingDialogOpen] = useState(false);
  const [initialTaskId, setInitialTaskId] = useState<string | null>(null);
  const [isEvidenceSubmitting, setIsEvidenceSubmitting] = useState(false);

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

  const handleEvidenceSubmit = async (
    taskId: string,
    evidence: { description: string; files: File[] },
    submitForReview: boolean
  ) => {
    if (!selectedPair?.id || !user?.id) return;
    
    setIsEvidenceSubmitting(true);
    try {
      // 1. Upload each file
      const uploadPromises = evidence.files.map(file => 
        uploadEvidenceFile(file, selectedPair.id, user.id)
      );
      
      const fileUrls = await Promise.all(uploadPromises);

      // 2. Create evidence record(s)
      // For simplicity, we'll create one primary record with all info if notes are provided, 
      // or multiple if needed. Here we'll create one for each file or one overall if only notes.
      if (evidence.files.length > 0) {
        for (let i = 0; i < fileUrls.length; i++) {
          const file = evidence.files[i];
          await createEvidence({
            pair_id: selectedPair.id,
            pair_task_id: taskId,
            submitted_by: user.id,
            type: file.type.startsWith('image/') ? 'photo' : 'file',
            file_url: fileUrls[i],
            file_name: file.name,
            mime_type: file.type,
            file_size: file.size,
            description: i === 0 ? evidence.description : `Additional file: ${file.name}`,
            status: submitForReview ? 'pending' : 'approved'
          });

        }
      } else if (evidence.description.trim()) {
        // Just notes
        await createEvidence({
          pair_id: selectedPair.id,
          pair_task_id: taskId,
          submitted_by: user.id,
          type: 'text',
          description: evidence.description,
          status: submitForReview ? 'pending' : 'approved'
        });
      }

      // 3. Update task status if submitting for review or marking as completed
      if (submitForReview) {
        const requiresReview = selectedTask?.evidence_type?.requires_submission;
        const nextStatus = requiresReview ? 'awaiting_review' : 'completed';
        
        await updateStatus(taskId, nextStatus);
        
        if (requiresReview) {
          toast.success('Evidence submitted for review');
        } else {
          toast.success('Task marked as completed');
        }
      } else {
        toast.success('Progress saved successfully');
      }

      queryClient.invalidateQueries({ queryKey: ['pair-evidence', selectedPair.id] });
      setIsTaskDialogOpen(false);
    } catch (error) {
      console.error('Error submitting evidence:', error);
      toast.error('Failed to submit evidence');
    } finally {
      setIsEvidenceSubmitting(false);
    }
  };

  const handleViewDetails = (task: any) => {
    setSelectedTask(task);
    setIsTaskDialogOpen(true);
  };

  const handleCreateMeeting = (taskId: string) => {
    setInitialTaskId(taskId);
    setIsMeetingDialogOpen(true);
  };

  const handleMeetingSubmit = async (data: any) => {
    try {
      await createMeeting(data);
      setIsMeetingDialogOpen(false);
      setInitialTaskId(null);
      toast.success('Meeting scheduled successfully');
    } catch (error) {
      toast.error('Failed to schedule meeting');
    }
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

  if (pairsLoading || tasksLoading) {
    return (
      <Fragment>
        <Container>
          <Toolbar>
            <ToolbarHeading title="Tasks" description="Loading mentoring tasks..." />
          </Toolbar>
        </Container>
        <Container>
          <div className="text-center py-12 text-muted-foreground">
            <KeenIcon icon="loading" className="animate-spin mb-2 text-2xl" />
            <p>Loading tasks...</p>
          </div>
        </Container>
      </Fragment>
    );
  }

  if (!selectedPair) {
    return (
      <Fragment>
        <Container>
          <Toolbar>
            <ToolbarHeading title="Tasks" description="No mentoring relationship found" />
          </Toolbar>
        </Container>
        <Container>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="size-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <KeenIcon icon="user" className="text-3xl text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2 text-gray-900">No Pairing Found</h2>
              <p className="text-muted-foreground text-center max-w-sm">
                You don't have an active mentoring relationship selected at the moment. Please select one from the dashboard or header.
              </p>
            </CardContent>
          </Card>
        </Container>
      </Fragment>
    );
  }

  const otherUser = isMentor ? selectedPair.mentee : selectedPair.mentor;

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Mentoring Tasks"
            description="Track progress and complete requirements for this mentoring relationship"
          />
        </Toolbar>
      </Container>

      <Container>
        <PairingSelector />
        
        <div className="grid gap-5 lg:gap-7.5">
          {/* Progress Card */}
          {stats && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground uppercase mb-1">Overall Progress</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-bold text-gray-900">{stats.completion_percentage}%</p>
                      <span className="text-sm text-muted-foreground">
                        ({stats.completed} of {stats.total} tasks completed)
                      </span>
                    </div>
                  </div>
                </div>
                <Progress value={stats.completion_percentage} className="h-2.5" />
              </CardContent>
            </Card>
          )}

          {/* Tasks List */}
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
                onCreateMeeting={handleCreateMeeting}
              />
            </CardContent>
          </Card>
        </div>
      </Container>

      {/* Task Dialog */}
      {selectedTask && (
        <TaskDialog
          open={isTaskDialogOpen}
          onOpenChange={setIsTaskDialogOpen}
          task={{
            id: selectedTask.id,
            name: selectedTask.name,
            status: selectedTask.status,
            description: selectedTask.task?.description,
            evidence_type: selectedTask.evidence_type,
            completed_at: selectedTask.completed_at,
          }}
          pairId={selectedPair?.id || ''}
          onSubmitEvidence={handleEvidenceSubmit}
          onUpdateStatus={handleToggleTask}
          isSubmitting={isEvidenceSubmitting}
        />
      )}

      {/* Meeting Dialog */}
      <MeetingDialog
        open={isMeetingDialogOpen}
        onOpenChange={setIsMeetingDialogOpen}
        pairId={selectedPair?.id || ''}
        initialTaskId={initialTaskId}
        onSubmit={handleMeetingSubmit}
        isSubmitting={isCreating}
      />
    </Fragment>
  );
}
