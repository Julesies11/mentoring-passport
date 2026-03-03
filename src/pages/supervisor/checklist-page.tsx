import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useAllPairs, usePairs } from '@/hooks/use-pairs';
import { usePairTasks } from '@/hooks/use-tasks';
import { useAllMeetings } from '@/hooks/use-meetings';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchEvidenceTypes, type PairTask, type PairSubTask } from '@/lib/api/tasks';
import { fetchPairEvidence } from '@/lib/api/evidence';
import { createMeeting } from '@/lib/api/meetings';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KeenIcon } from '@/components/keenicons';
import { PairTaskEditDialog } from '@/components/tasks/pair-task-edit-dialog';
import { MeetingDialog } from '@/components/meetings/meeting-dialog';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarPublicUrl, getInitials } from '@/lib/utils/avatar';
import { toast } from 'sonner';
import { TaskSetupGrid } from '@/components/tasks/task-setup-grid';
import { TaskProgressGrid } from '@/components/tasks/task-progress-grid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PAIR_STATUS_COLORS } from '@/config/constants';

export function SupervisorChecklistPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: pairs = [], isLoading: pairsLoading } = useAllPairs();
  const { updatePairAsync, archivePairAsync, restorePairAsync } = usePairs();
  const [searchParams] = useSearchParams();
  const [selectedPairId, setSelectedPairId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('setup');
  
  // Meeting Dialog State
  const [isMeetingDialogOpen, setIsMeetingDialogOpen] = useState(false);
  const [targetTaskId, setTargetTaskId] = useState<string | null>(null);

  // Management State
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const selectedPair = pairs.find(p => p.id === selectedPairId);
  
  const { 
    tasks, 
    stats, 
    isLoading: tasksLoading, 
    createTask,
    updateTask,
    deleteTask,
    createSubTask,
    updateSubTask,
    deleteSubTask,
    reorderTasks,
    isUpdating,
    isCreating,
    isDeleting
  } = usePairTasks(selectedPairId || '');

  const { data: pairEvidence = [] } = useQuery({
    queryKey: ['pair-evidence', selectedPairId],
    queryFn: () => fetchPairEvidence(selectedPairId),
    enabled: !!selectedPairId,
  });

  const { meetings = [], isLoading: meetingsLoading } = useAllMeetings();
  const pairMeetings = useMemo(() => 
    meetings.filter(m => m.pair_id === selectedPairId),
    [meetings, selectedPairId]
  );

  const { data: evidenceTypes = [] } = useQuery({
    queryKey: ['evidence-types'],
    queryFn: fetchEvidenceTypes,
  });

  // Automatically expand all tasks by default
  useEffect(() => {
    if (tasks && tasks.length > 0) {
      setExpandedTasks(new Set(tasks.map(task => task.id)));
    }
  }, [tasks]);

  // Auto-select first pair if none selected
  useEffect(() => {
    if (!selectedPairId && pairs.length > 0 && !pairsLoading) {
      // Check if there's a pair in the search params first (the existing useEffect handles this)
      const pairIdFromUrl = searchParams.get('pair');
      if (!pairIdFromUrl) {
        setSelectedPairId(pairs[0].id);
      }
    }
  }, [pairs, pairsLoading, selectedPairId, searchParams]);

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

  const activePairs = pairs.filter(p => p.status === 'active');

  // Handle URL parameter for pair selection and task deep linking
  useEffect(() => {
    const pairId = searchParams.get('pair');
    const taskId = searchParams.get('taskId');

    if (pairId && pairId !== selectedPairId && pairs.some(p => p.id === pairId)) {
      setSelectedPairId(pairId);
    }

    if (taskId) {
      setActiveTab('monitoring');
      setExpandedTasks(prev => new Set([...Array.from(prev), taskId]));
      
      // Small delay to allow tab content to render before scrolling
      setTimeout(() => {
        const element = document.getElementById(`task-${taskId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-primary', 'ring-offset-4');
          setTimeout(() => element.classList.remove('ring-2', 'ring-primary', 'ring-offset-4'), 3000);
        }
      }, 500);
    }
  }, [searchParams, pairs, selectedPairId]);

  const handleAddTask = async () => {
    if (!selectedPairId) return;
    
    const fallbackEvidenceType = (evidenceTypes as any[]).find((t: any) => t.name.toLowerCase().includes('not applicable')) || evidenceTypes[0];
    
    const maxSortOrder = tasks.reduce((max: number, t: any) => Math.max(max, t.sort_order), 0) || 0;

    createTask({
      pair_id: selectedPairId,
      name: 'New Custom Task',
      status: 'not_submitted',
      sort_order: maxSortOrder + 1,
      evidence_type_id: fallbackEvidenceType?.id,
      master_task_id: null
    } as any, {
      onSuccess: (newTask) => {
        handleOpenEditDialog(newTask);
      }
    });
  };

  const handleDeleteTask = (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task for this pair? This will remove all associated subtasks and cannot be undone.')) {
      deleteTask(taskId);
      setIsEditTaskOpen(false);
      setSelectedTaskId(null);
    }
  };

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

  const handleOpenEditDialog = (task: PairTask) => {
    setSelectedTaskId(task.id);
    setIsReadOnly(false);
    setIsEditTaskOpen(true);
  };

  const handleUpdateTask = (taskId: string, updates: Partial<PairTask>) => {
    updateTask(taskId, updates, {
      onSuccess: () => {
        setIsEditTaskOpen(false);
        setSelectedTaskId(null);
        toast.success('Task updated successfully');
      }
    });
  };

  const handleCreateSubTask = (taskId: string, name: string, evidenceTypeId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const maxSortOrder = task.subtasks?.reduce((max: number, st: any) => Math.max(max, st.sort_order), 0) || 0;

    createSubTask({
      pair_task_id: taskId,
      name,
      sort_order: maxSortOrder + 1,
      is_completed: false,
      evidence_type_id: evidenceTypeId,
      master_subtask_id: null
    } as any);
  };

  const handleReorderSubTasks = (taskId: string, newOrder: PairSubTask[]) => {
    newOrder.forEach((st, index) => {
      if (st.sort_order !== index + 1) {
        updateSubTask(st.id, { sort_order: index + 1 });
      }
    });
  };

  const handleTaskReorder = (newOrder: PairTask[]) => {
    const updates = newOrder.map((task, index) => ({
      id: task.id,
      sort_order: index + 1,
    }));
    reorderTasks(updates);
  };

  const handleViewDetails = (task: any) => {
    setSelectedTaskId(task.id);
    setIsReadOnly(true);
    setIsEditTaskOpen(true);
  };

  const handleAddMeetingToTask = (taskId: string) => {
    setTargetTaskId(taskId);
    setIsMeetingDialogOpen(true);
  };

  const handleMeetingSubmit = async (meetingInput: any) => {
    try {
      await createMeeting(meetingInput);
      queryClient.invalidateQueries({ queryKey: ['all-meetings'] });
      toast.success('Meeting scheduled and linked to task');
      setIsMeetingDialogOpen(false);
    } catch (error) {
      toast.error('Failed to schedule meeting');
    }
  };

  const handlePairStatusChange = async (status: 'active' | 'completed' | 'archived') => {
    if (!selectedPairId) return;
    
    try {
      if (status === 'archived') {
        if (window.confirm('Are you sure you want to archive this pair?')) {
          await archivePairAsync(selectedPairId);
          toast.success('Pairing archived successfully');
        }
      } else if (selectedPair?.status === 'archived' && status === 'active') {
        await restorePairAsync(selectedPairId);
        toast.success('Pairing restored to active status');
      } else {
        await updatePairAsync(selectedPairId, { status });
        toast.success(`Pairing status updated to ${status}`);
      }
    } catch (error: any) {
      console.error('Error updating pair status:', error);
      if (error.code === '23505') {
        toast.error('Cannot set to active: these participants already have another active pairing.');
      } else {
        toast.error('Failed to update status. Please try again.');
      }
    }
  };

  const currentTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return enrichedTasks.find(t => t.id === selectedTaskId) || null;
  }, [selectedTaskId, enrichedTasks]);

  return (
    <>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Pair Management"
            description={selectedPair ? `Managing progress and setup for ${selectedPair.mentor?.full_name} ↔ ${selectedPair.mentee?.full_name}` : "View and manage checklist progress for mentoring pairs"}
          />
        </Toolbar>
      </Container>

      <Container>
        <div className="grid gap-5 lg:gap-7.5">
          {/* Pair Selection and Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-7.5">
            <Card className="lg:col-span-1">
              <CardContent className="p-5">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Select Mentoring Pair</label>
                    <select 
                      className="bg-gray-50 border border-gray-200 h-11 rounded-md px-3 outline-none focus:ring-2 focus:ring-primary/20 text-sm font-bold text-gray-900"
                      value={selectedPairId} 
                      onChange={(e) => setSelectedPairId(e.target.value)}
                    >
                      <option value="">Choose a pair...</option>
                      {pairs.map((pair) => (
                        <option key={pair.id} value={pair.id}>
                          {pair.mentor?.full_name} ↔ {pair.mentee?.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedPair && (
                    <div className="pt-4 border-t border-gray-100 space-y-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarImage src={getAvatarPublicUrl(selectedPair.mentor?.avatar_url, selectedPair.mentor?.id)} alt={selectedPair.mentor?.full_name || ''} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                            {getInitials(selectedPair.mentor?.full_name || selectedPair.mentor?.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter leading-none mb-1">Mentor</span>
                          <span className="text-sm font-bold text-gray-900 truncate">{selectedPair.mentor?.full_name}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarImage src={getAvatarPublicUrl(selectedPair.mentee?.avatar_url, selectedPair.mentee?.id)} alt={selectedPair.mentee?.full_name || ''} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                            {getInitials(selectedPair.mentee?.full_name || selectedPair.mentee?.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] font-black text-green-600 uppercase tracking-tighter leading-none mb-1">Mentee</span>
                          <span className="text-sm font-bold text-gray-900 truncate">{selectedPair.mentee?.full_name}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {selectedPair && stats && (
              <Card className="lg:col-span-2 border-primary/10 bg-primary/[0.02]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Checklist Progress</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-4xl font-black text-gray-900">{stats.completion_percentage}%</p>
                        <span className="text-sm font-bold text-muted-foreground uppercase">
                          ({stats.completed} / {stats.total} items)
                        </span>
                      </div>
                    </div>
                  </div>
                  <Progress value={stats.completion_percentage} className="h-3 bg-white border border-primary/5" />
                  
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                      <div className="size-10 rounded-lg bg-yellow-50 flex items-center justify-center text-yellow-500">
                        <KeenIcon icon="time" className="text-xl" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Awaiting Review</p>
                        <p className="text-xl font-black text-gray-900">{stats.awaiting_review || 0}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                      <div className="size-10 rounded-lg bg-green-50 flex items-center justify-center text-success">
                        <KeenIcon icon="check-circle" className="text-xl" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Completed</p>
                        <p className="text-xl font-black text-gray-900">{stats.completed || 0}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {pairsLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <KeenIcon icon="loading" className="animate-spin mb-2 text-2xl" />
              <p>Loading details...</p>
            </div>
          ) : selectedPair ? (
            <>
              <Tabs defaultValue="setup" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-5">
                  <TabsTrigger value="setup" className="font-bold uppercase text-[10px] tracking-widest">
                    <KeenIcon icon="setting-2" className="mr-2" />
                    Checklist Setup
                  </TabsTrigger>
                  <TabsTrigger value="monitoring" className="font-bold uppercase text-[10px] tracking-widest">
                    <KeenIcon icon="chart-line" className="mr-2" />
                    Progress Monitoring
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="setup" className="mt-0 animate-in fade-in duration-300">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between py-4 border-b border-gray-100">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        Checklist Setup
                      </h3>
                      <Button
                        size="sm"
                        onClick={handleAddTask}
                        disabled={isCreating}
                      >
                        <KeenIcon icon="plus" />
                        Add Custom Task
                      </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                      {tasksLoading ? (
                        <div className="text-center py-20 bg-gray-50/50 rounded-3xl border border-gray-100 m-5">
                          <KeenIcon icon="loading" className="animate-spin mb-3 text-3xl text-primary" />
                          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Initialising Checklist...</p>
                        </div>
                      ) : (
                        <TaskSetupGrid
                          tasks={tasks}
                          expandedTasks={expandedTasks}
                          onToggleExpand={handleToggleExpand}
                          onEdit={handleOpenEditDialog}
                          onDelete={handleDeleteTask}
                          onReorder={handleTaskReorder}
                          isDeleting={isDeleting}
                        />
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="monitoring" className="mt-0">
                  <Card>
                    <CardHeader className="py-4 border-b border-gray-100">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        Real-time Progress
                      </h3>
                    </CardHeader>
                    <CardContent className="p-0">
                      {tasksLoading ? (
                        <div className="text-center py-20 bg-gray-50/50 rounded-3xl border border-gray-100 m-5">
                          <KeenIcon icon="loading" className="animate-spin mb-3 text-3xl text-primary" />
                          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Initialising Checklist...</p>
                        </div>
                      ) : (
                        <TaskProgressGrid
                          tasks={enrichedTasks}
                          expandedTasks={expandedTasks}
                          onToggleExpand={handleToggleExpand}
                          onViewDetails={handleViewDetails}
                          onCreateMeeting={handleAddMeetingToTask}
                          readOnly={true}
                        />
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          ) : activePairs.length === 0 ? (
            <Card className="border-dashed border-2 border-gray-200 bg-gray-50/30">
              <CardContent className="flex flex-col items-center justify-center py-20">
                <div className="size-24 rounded-3xl bg-white shadow-sm flex items-center justify-center mb-6 border border-gray-100">
                  <KeenIcon icon="information-2" className="text-5xl text-gray-300" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">No Active Pairs</h3>
                <p className="text-muted-foreground text-center max-w-sm font-medium">
                  There are no active mentoring pairs in the system. Create a pair to start customizing their checklist.
                </p>
                <Button className="mt-8 font-bold h-11 px-8 rounded-xl shadow-lg shadow-primary/20" asChild>
                  <Link to="/supervisor/pairs">
                    <KeenIcon icon="plus" />
                    Create First Pair
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-2 border-gray-200 bg-gray-50/30">
              <CardContent className="flex flex-col items-center justify-center py-20">
                <div className="size-24 rounded-3xl bg-white shadow-sm flex items-center justify-center mb-6 border border-gray-100">
                  <KeenIcon icon="mouse-square" className="text-5xl text-gray-300" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Select a Pair</h3>
                <p className="text-muted-foreground text-center max-w-sm font-medium">
                  Please select a mentoring pair from the dropdown above to view and manage their custom checklist.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </Container>

      {/* Meeting Dialog for linking to tasks */}
      {selectedPairId && (
        <MeetingDialog
          open={isMeetingDialogOpen}
          onOpenChange={setIsMeetingDialogOpen}
          pairId={selectedPairId}
          initialTaskId={targetTaskId}
          onSubmit={handleMeetingSubmit}
        />
      )}

      <PairTaskEditDialog
        open={isEditTaskOpen}
        onOpenChange={setIsEditTaskOpen}
        task={currentTask}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
        onCreateSubTask={handleCreateSubTask}
        onUpdateSubTask={updateSubTask}
        onDeleteSubTask={deleteSubTask}
        onReorderSubTasks={handleReorderSubTasks}
        isUpdating={isUpdating}
        readOnly={isReadOnly}
      />
    </>
  );
}
