import { useState, useMemo, useEffect } from 'react';
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
import { useSearchParams } from 'react-router-dom';
import { TaskProgressGrid } from '@/components/tasks/task-progress-grid';
import { TaskDialog } from '@/components/tasks/task-dialog';
import { MeetingDialog } from '@/components/meetings/meeting-dialog';
import { PairingSelector } from '@/components/common/pairing-selector';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchPairEvidence, uploadEvidenceFile, createEvidence, deleteEvidence } from '@/lib/api/evidence';
import { toast } from 'sonner';
import { usePairing } from '@/providers/pairing-provider';

export function ProgramMemberTasksPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { selectedPairing: selectedPair, pairings, isLoading: pairsLoading, setSelectedPairingId } = usePairing();
  
  const { tasks, stats, isLoading: tasksLoading, updateStatus, updateSubTask } = usePairTasks(selectedPair?.id || '');

  // Handle URL parameters for pair selection and task scrolling
  useEffect(() => {
    const pairIdFromUrl = searchParams.get('pair');
    const taskIdFromUrl = searchParams.get('taskId');

    // 1. Sync pair selection if needed
    if (pairIdFromUrl && pairIdFromUrl !== selectedPair?.id) {
      const exists = pairings.find(p => p.id === pairIdFromUrl);
      if (exists) {
        setSelectedPairingId(pairIdFromUrl);
      }
    }

    // 2. Scroll to task if specified and loaded
    if (taskIdFromUrl && tasks.length > 0 && !tasksLoading) {
      // Small delay to ensure DOM is ready after potential re-renders
      const timer = setTimeout(() => {
        const element = document.getElementById(`task-${taskIdFromUrl}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchParams, tasks, tasksLoading, pairings, selectedPair?.id, setSelectedPairingId]);

  const { data: pairEvidence = [] } = useQuery({
    queryKey: ['pair-evidence', selectedPair?.id],
    queryFn: () => fetchPairEvidence(selectedPair?.id || ''),
    enabled: !!selectedPair?.id,
  });

  const { meetings = [], createMeeting, updateMeeting, deleteMeeting, isCreating, isUpdating } = useAllMeetings();
  const pairMeetings = useMemo(() => 
    meetings.filter(m => m.pair_id === selectedPair?.id),
    [meetings, selectedPair?.id]
  );

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

  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [lastAutoExpandedPairId, setLastAutoExpandedPairId] = useState<string | null>(null);

  // Automatically expand all tasks by default only when the selected pair changes
  useEffect(() => {
    if (selectedPair?.id && tasks.length > 0 && selectedPair.id !== lastAutoExpandedPairId) {
      setExpandedTasks(new Set(tasks.map(task => task.id)));
      setLastAutoExpandedPairId(selectedPair.id);
    }
  }, [tasks, selectedPair?.id, lastAutoExpandedPairId]);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask = useMemo(() => 
    enrichedTasks.find(t => t.id === selectedTaskId),
    [enrichedTasks, selectedTaskId]
  );

  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);

  // Meeting Dialog State
  const [isMeetingDialogOpen, setIsMeetingDialogOpen] = useState(false);
  const [initialTaskId, setInitialTaskId] = useState<string | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [isEvidenceSubmitting, setIsEvidenceSubmitting] = useState(false);

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
        uploadEvidenceFile(file, selectedPair.id)
      );
      
      const fileUrls = await Promise.all(uploadPromises);

      // 2. Create evidence record(s) for files
      if (evidence.files.length > 0) {
        for (let i = 0; i < fileUrls.length; i++) {
          const file = evidence.files[i];
          await createEvidence({
            pair_id: selectedPair.id,
            pair_task_id: taskId,
            file_url: fileUrls[i],
            file_name: file.name,
            mime_type: file.type,
            file_size: file.size,
            description: `File upload for task: ${selectedTask?.name || taskId}`,
            status: submitForReview ? 'pending' : 'approved'
          });
        }
      }

      // 3. Update task status if submitting for review or marking as completed
      if (submitForReview) {
        const requiresReview = selectedTask?.evidence_type?.requires_submission;
        const hasFiles = evidence.files.length > 0;
        // If it strictly requires review OR they uploaded files, it must go to awaiting_review
        const nextStatus = (requiresReview || hasFiles) ? 'awaiting_review' : 'completed';
        
        // Save notes directly to the task's evidence_notes field
        await updateStatus(taskId, nextStatus, evidence.description);
        
        if (nextStatus === 'awaiting_review') {
          toast.success('Evidence submitted for review');
        } else {
          toast.success('Task marked as completed');
        }
      } else {
        // Just save notes/draft
        if (evidence.description.trim()) {
          await updateStatus(taskId, selectedTask?.status || 'not_submitted', evidence.description);
        }
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

  const handleDeleteEvidence = async (evidenceId: string) => {
    try {
      await deleteEvidence(evidenceId);
      queryClient.invalidateQueries({ queryKey: ['pair-evidence', selectedPair?.id] });
      queryClient.invalidateQueries({ queryKey: ['pair-tasks', selectedPair?.id] });
      toast.success('Evidence removed');
    } catch (error) {
      toast.error('Failed to remove evidence');
    }
  };

  const handleViewDetails = (task: any) => {
    setSelectedTaskId(task.id);
    setIsTaskDialogOpen(true);
  };

  const handleCreateMeeting = (taskId: string) => {
    setInitialTaskId(taskId);
    setSelectedMeeting(null);
    setIsMeetingDialogOpen(true);
  };

  const handleEditMeeting = (meeting: any) => {
    setSelectedMeeting(meeting);
    setInitialTaskId(meeting.pair_task_id || null);
    setIsMeetingDialogOpen(true);
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    try {
      await deleteMeeting(meetingId);
      setIsMeetingDialogOpen(false);
      toast.success('Meeting deleted successfully');
    } catch (error) {
      toast.error('Failed to delete meeting');
    }
  };

  const handleMeetingSubmit = async (data: any) => {
    try {
      if (selectedMeeting) {
        await updateMeeting(selectedMeeting.id, data);
        toast.success('Meeting updated successfully');
      } else {
        await createMeeting(data);
        toast.success('Meeting scheduled successfully');
      }
      setIsMeetingDialogOpen(false);
      setInitialTaskId(null);
      setSelectedMeeting(null);
    } catch (error) {
      toast.error(selectedMeeting ? 'Failed to update meeting' : 'Failed to schedule meeting');
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const task = enrichedTasks.find(t => t.id === taskId);
    const requiresSubmission = task?.evidence_type?.requires_submission;

    if (currentStatus !== 'completed' && requiresSubmission) {
      // If task requires evidence, open the dialog instead of just marking as completed
      setSelectedTask(task);
      setIsTaskDialogOpen(true);
      return;
    }

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
      <>
        <div className="hidden sm:block">
          <Container>
            <Toolbar>
              <ToolbarHeading title="Tasks" description="Loading mentoring tasks..." />
            </Toolbar>
          </Container>
        </div>
        <Container className="sm:mt-0 mt-4">
          <div className="text-center py-12 text-muted-foreground">
            <KeenIcon icon="loading" className="animate-spin mb-2 text-2xl" />
            <p>Loading tasks...</p>
          </div>
        </Container>
      </>
    );
  }

  if (!selectedPair) {
    return (
      <>
        <div className="hidden sm:block">
          <Container>
            <Toolbar>
              <ToolbarHeading title="Tasks" description="No mentoring relationship found" />
            </Toolbar>
          </Container>
        </div>
        <Container className="sm:mt-0 mt-4">
          <PairingSelector />
          <Card className="border-0 sm:border shadow-none sm:shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="size-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <KeenIcon icon="user" className="text-3xl text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2 text-gray-900">No Relationship Selected</h2>
              <p className="text-muted-foreground text-center max-w-sm">
                Please select a mentoring relationship from the dropdown above to view your tasks.
              </p>
            </CardContent>
          </Card>
        </Container>
      </>
    );
  }

  return (
    <>
      <div className="hidden sm:block">
        <Container>
          <Toolbar>
            <ToolbarHeading
              title="Mentoring Tasks"
              description="Track progress and complete requirements for this mentoring relationship"
            />
            <ToolbarActions />
          </Toolbar>
        </Container>
      </div>

      <Container className="sm:mt-0 mt-4">
        <PairingSelector />
        
        <div className="grid gap-2 sm:gap-5 lg:gap-7.5 min-w-0">
          {/* Progress Card */}
          {stats && (
            <Card className="border-0 sm:border shadow-none sm:shadow-sm">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-sm font-semibold text-muted-foreground uppercase mb-0.5 sm:mb-1">Overall Progress</p>
                    <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5">
                      <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.completion_percentage}%</p>
                      <span className="text-[10px] sm:text-sm text-muted-foreground">
                        ({stats.completed} of {stats.total} tasks completed)
                      </span>
                    </div>
                  </div>
                </div>
                <Progress value={stats.completion_percentage} className="h-2 sm:h-2.5" />
              </CardContent>
            </Card>
          )}

          {/* Tasks List */}
          <div className="border-0 sm:border sm:rounded-xl sm:bg-card sm:shadow-sm min-w-0 w-full">
            <CardHeader className="hidden sm:flex">
              <CardTitle>Mentoring Tasks</CardTitle>
            </CardHeader>
            <div className="p-0 min-w-0 w-full">
              <TaskProgressGrid
                tasks={enrichedTasks}
                expandedTasks={expandedTasks}
                onToggleExpand={handleToggleExpand}
                onViewDetails={handleViewDetails}
                onToggleTask={handleToggleTask}
                onToggleSubTask={updateSubTask}
                onCreateMeeting={handleCreateMeeting}
                onEditMeeting={handleEditMeeting}
              />            </div>
          </div>
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
            last_feedback: selectedTask.last_feedback,
            evidence_notes: selectedTask.evidence_notes,
            rejection_reason: selectedTask.rejection_reason,
            description: selectedTask.task?.description,
            evidence_type: selectedTask.evidence_type,
            completed_at: selectedTask.completed_at,
            evidence: selectedTask.evidence,
          }}
          pairId={selectedPair?.id || ''}
          onSubmitEvidence={handleEvidenceSubmit}
          onDeleteEvidence={handleDeleteEvidence}
          onUpdateStatus={handleToggleTask}
          isSubmitting={isEvidenceSubmitting}
        />
      )}

      {/* Meeting Dialog */}
      <MeetingDialog
        open={isMeetingDialogOpen}
        onOpenChange={setIsMeetingDialogOpen}
        pairId={selectedPair?.id || ''}
        meeting={selectedMeeting}
        initialTaskId={initialTaskId}
        onSubmit={handleMeetingSubmit}
        onDelete={handleDeleteMeeting}
        isSubmitting={selectedMeeting ? isUpdating : isCreating}
      />
    </>
  );
}
