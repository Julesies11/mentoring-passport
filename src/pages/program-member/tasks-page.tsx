import { useState, useMemo, useEffect, useRef } from 'react';
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
import { PairTaskEditDialog } from '@/components/tasks/pair-task-edit-dialog';
import { MeetingDialog } from '@/components/meetings/meeting-dialog';
import { PairingSelector } from '@/components/common/pairing-selector';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchPairEvidence, uploadEvidenceFile, createEvidence, deleteEvidence } from '@/lib/api/evidence';
import { fetchEvidenceTypes, type PairTask } from '@/lib/api/tasks';
import { toast } from 'sonner';
import { usePairing } from '@/providers/pairing-provider';
import { Button } from '@/components/ui/button';

export function ProgramMemberTasksPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { selectedPairing: selectedPair, pairings, isLoading: pairsLoading, setSelectedPairingId } = usePairing();
  
  // Ref to track if we've already handled the initial deep-link scroll
  const hasInitialScrolled = useRef<{taskId: string | null, evidenceId: string | null}>({ taskId: null, evidenceId: null });
  
  const isArchived = selectedPair?.program?.status === 'inactive' || selectedPair?.status === 'archived';
  const { 
    tasks, 
    stats, 
    isLoading: tasksLoading, 
    updateStatus, 
    createTask, 
    updateTask,
    createSubTask,
    updateSubTask,
    deleteSubTask,
    isCreating,
    isUpdating
  } = usePairTasks(selectedPair?.id || '');

  const { data: evidenceTypes = [] } = useQuery({
    queryKey: ['evidence-types'],
    queryFn: fetchEvidenceTypes,
  });

  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const currentTask = useMemo(() => {
    if (!editingTaskId) return null;
    if (editingTaskId === 'new-task') {
      const fallback = evidenceTypes.find((t: any) => t.name.toLowerCase().includes('not applicable')) || evidenceTypes[0];
      return {
        id: 'new-task',
        pair_id: selectedPair?.id || '',
        name: '',
        status: 'not_submitted',
        sort_order: tasks.length + 1,
        evidence_type_id: fallback?.id || '',
        is_custom: true,
        subtasks: []
      } as any;
    }
    return tasks.find(t => t.id === editingTaskId) || null;
  }, [editingTaskId, tasks, selectedPair?.id, evidenceTypes]);

  const { data: pairEvidence = [] } = useQuery({
    queryKey: ['pair-evidence', selectedPair?.id],
    queryFn: () => fetchPairEvidence(selectedPair?.id || ''),
    enabled: !!selectedPair?.id,
  });

  const { meetings = [], createMeeting, updateMeeting, deleteMeeting, isCreating: isCreatingMeeting, isUpdating: isUpdatingMeeting } = useAllMeetings();
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

  // Extract URL parameters for stable dependencies
  const pairIdFromUrl = searchParams.get('pair');
  const taskIdFromUrl = searchParams.get('taskId');
  const evidenceIdFromUrl = searchParams.get('id');

  // Sync pair selection from URL
  useEffect(() => {
    if (pairIdFromUrl && pairIdFromUrl !== selectedPair?.id) {
      const exists = pairings.find(p => p.id === pairIdFromUrl);
      if (exists) {
        setSelectedPairingId(pairIdFromUrl);
      }
    }
  }, [pairIdFromUrl, pairings, selectedPair?.id, setSelectedPairingId]);

  // Handle task scrolling (Deep Linking)
  useEffect(() => {
    // If we have an evidenceId, find the associated task first
    let scrollId = taskIdFromUrl;
    if (evidenceIdFromUrl && pairEvidence.length > 0) {
      const evidence = pairEvidence.find(e => e.id === evidenceIdFromUrl);
      if (evidence?.pair_task_id) {
        scrollId = evidence.pair_task_id;
      }
    }

    // Only scroll if we haven't scrolled to THIS specific combination of IDs yet
    if (scrollId && enrichedTasks.length > 0 && !tasksLoading && 
        (hasInitialScrolled.current.taskId !== taskIdFromUrl || hasInitialScrolled.current.evidenceId !== evidenceIdFromUrl)) {
      
      // Update the ref IMMEDIATELY to prevent multiple triggers while timer is running
      hasInitialScrolled.current = { taskId: taskIdFromUrl, evidenceId: evidenceIdFromUrl };

      const timer = setTimeout(() => {
        const element = document.getElementById(`task-${scrollId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-primary/20', 'bg-primary/[0.02]');
          
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-primary/20', 'bg-primary/[0.02]');
          }, 3000);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [taskIdFromUrl, evidenceIdFromUrl, enrichedTasks.length, tasksLoading, pairEvidence]);

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
    } catch (_error) {
      console.error('Error submitting evidence:', _error);
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
    } catch (_error) {
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
    } catch (_error) {
      error('Failed to delete meeting');
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
    } catch (_error) {
      toast.error(selectedMeeting ? 'Failed to update meeting' : 'Failed to schedule meeting');
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: string, forceToggle: boolean = false) => {
    const task = enrichedTasks.find(t => t.id === taskId);
    const requiresSubmission = task?.evidence_type?.requires_submission;

    // Logic: If NOT not_submitted, we are "un-checking" or resetting
    const isUnchecking = currentStatus !== 'not_submitted';

    if (!forceToggle && !isUnchecking && requiresSubmission) {
      // If task requires evidence, open the dialog instead of just marking as completed
      setSelectedTaskId(taskId);
      setIsTaskDialogOpen(true);
      return;
    }

    // If unchecking, reset to not_submitted. If checking, set to completed.
    const newStatus = isUnchecking ? 'not_submitted' : 'completed';
    
    try {
      await updateStatus(taskId, newStatus);
      
      // If we just re-opened a completed task, notify the supervisor
      if (currentStatus === 'completed' && newStatus === 'not_submitted' && user?.id) {
        const mentorName = task?.pair?.mentor?.full_name || 'Mentor';
        const menteeName = task?.pair?.mentee?.full_name || 'Mentee';
        const actorName = user.full_name || user.email || 'Participant';
        
        await NotificationService.notifyTaskReopened(
          task?.name || 'Task',
          selectedPair?.id || '',
          mentorName,
          menteeName,
          user.id,
          actorName
        );
      }

      toast.success(`Task ${newStatus === 'completed' ? 'completed' : 're-opened'}`);
    } catch (_error) {
      toast.error('Failed to update task status');
    }
  };

  const handleAddTask = () => {
    if (!selectedPair?.id) return;
    setEditingTaskId('new-task');
    setIsEditTaskOpen(true);
  };

  const handleUpdateTask = (taskId: string, updates: Partial<PairTask> & { localSubTasks?: any[] }) => {
    if (!selectedPair?.id) return;

    if (taskId === 'new-task') {
      if (!updates.name?.trim() || !updates.evidence_type_id) {
        toast.error('Task name and evidence type are required.');
        return;
      }
      createTask({
        pair_id: selectedPair.id,
        name: updates.name,
        status: 'not_submitted',
        sort_order: tasks.length + 1,
        evidence_type_id: updates.evidence_type_id,
        is_custom: true
      } as any, {
        onSuccess: (newTask) => {
          if (updates.localSubTasks && updates.localSubTasks.length > 0) {
            Promise.all(updates.localSubTasks.map(st => 
              createSubTask({
                pair_task_id: newTask.id,
                name: st.name,
                evidence_type_id: st.evidence_type_id,
                sort_order: st.sort_order,
                is_completed: false,
                is_custom: true
              } as any)
            )).finally(() => {
              setIsEditTaskOpen(false);
              setEditingTaskId(null);
              toast.success('Custom task created successfully');
            });
          } else {
            setIsEditTaskOpen(false);
            setEditingTaskId(null);
            toast.success('Custom task created successfully');
          }
        }
      });
    } else {
      updateTask({ taskId, updates }, {
        onSuccess: () => {
          setIsEditTaskOpen(false);
          setEditingTaskId(null);
          toast.success('Task updated successfully');
        }
      });
    }
  };

  const handleCreateSubTask = (taskId: string, name: string, evidenceTypeId: string) => {
    if (taskId === 'new-task') {
      toast.error('Please save the task before adding subtasks.');
      return;
    }
    
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const maxSortOrder = task.subtasks?.reduce((max: number, st: any) => Math.max(max, st.sort_order), 0) || 0;

    createSubTask({
      pair_task_id: taskId,
      name,
      sort_order: maxSortOrder + 1,
      is_completed: false,
      evidence_type_id: evidenceTypeId,
      is_custom: true
    } as any);
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
            <div className="flex items-center gap-2">
              {!isArchived && (
                <Button size="sm" onClick={handleAddTask}>
                  <KeenIcon icon="plus" />
                  Add Custom Task
                </Button>
              )}
            </div>
          </Toolbar>
        </Container>
      </div>

      <Container className="sm:mt-0 mt-4">
        <PairingSelector />
        
        {isArchived && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-3 shadow-sm">
            <div className="size-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <KeenIcon icon="information-2" className="text-xl" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black text-amber-900 leading-tight">Read-Only History Mode</span>
              <span className="text-[11px] font-bold text-amber-700 leading-tight uppercase tracking-wider mt-0.5">
                This {selectedPair?.program?.status === 'inactive' ? 'program' : 'relationship'} has been finalised and can no longer be edited.
              </span>
            </div>
          </div>
        )}
        
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
                onToggleTask={(id, status) => handleToggleTask(id, status, true)}
                onToggleSubTask={updateSubTask}
                onCreateMeeting={handleCreateMeeting}
                onEditMeeting={handleEditMeeting}
                readOnly={isArchived}
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
        isSubmitting={selectedMeeting ? isUpdatingMeeting : isCreatingMeeting}
      />

      {/* Task Edit Dialog for Custom Tasks */}
      <PairTaskEditDialog
        open={isEditTaskOpen}
        onOpenChange={setIsEditTaskOpen}
        task={currentTask}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={(id) => {
          if (id === 'new-task') {
            setIsEditTaskOpen(false);
            setEditingTaskId(null);
          } else if (currentTask?.is_custom) {
            if (window.confirm('Are you sure you want to delete this custom task?')) {
              deletePairTask(id).then(() => {
                queryClient.invalidateQueries({ queryKey: ['pair-tasks', selectedPair?.id] });
                setIsEditTaskOpen(false);
                setEditingTaskId(null);
                toast.success('Custom task deleted');
              });
            }
          } else {
            toast.error('You cannot delete program tasks. Only tasks you added yourself.');
          }
        }}
        onCreateSubTask={handleCreateSubTask}
        onUpdateSubTask={updateSubTask}
        onDeleteSubTask={deleteSubTask}
        isUpdating={isUpdating || isCreating}
        readOnly={isArchived || (!currentTask?.is_custom && currentTask?.id !== 'new-task')}
      />

      {!isArchived && (
        <div className="sm:hidden fixed bottom-20 right-4 z-50">
          <Button
            size="lg"
            className="rounded-full shadow-lg h-14 w-14 p-0 flex items-center justify-center bg-primary text-white"
            onClick={handleAddTask}
          >
            <KeenIcon icon="plus" className="text-2xl" />
          </Button>
        </div>
      )}
    </>
  );
}
