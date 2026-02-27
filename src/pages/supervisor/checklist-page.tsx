import { Fragment, useState, useEffect } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useAllPairs } from '@/hooks/use-pairs';
import { usePairTasks } from '@/hooks/use-tasks';
import { useSearchParams } from 'react-router-dom';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { KeenIcon } from '@/components/keenicons';
import { TaskDialog } from '@/components/tasks/task-dialog';
import { cn } from '@/lib/utils';

const statusColors = {
  not_submitted: 'text-gray-400',
  awaiting_review: 'text-yellow-500',
  completed: 'text-success',
};

const statusLabels = {
  not_submitted: 'Not Started',
  awaiting_review: 'Awaiting Review',
  completed: 'Completed',
};

const statusIcons = {
  not_submitted: 'circle',
  awaiting_review: 'time',
  completed: 'check-circle',
};

export function SupervisorChecklistPage() {
  const { user } = useAuth();
  const { data: pairs = [], isLoading: pairsLoading } = useAllPairs();
  const [searchParams] = useSearchParams();
  const [selectedPairId, setSelectedPairId] = useState<string>('');
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  const selectedPair = pairs.find(p => p.id === selectedPairId);
  const { tasks, stats, isLoading: tasksLoading, updateStatus } = usePairTasks(selectedPairId || '');

  const activePairs = pairs.filter(p => p.status === 'active');

  // Handle URL parameter for pair selection
  useEffect(() => {
    const pairId = searchParams.get('pair');
    if (pairId && pairs.some(p => p.id === pairId)) {
      setSelectedPairId(pairId);
    }
  }, [searchParams, pairs]);

  const handleSaveTask = async (taskId: string, newName: string) => {
    console.log('Saving task:', taskId, newName);
    setEditingTask(null);
  };

  const handleAddTask = async () => {
    if (!newTaskName.trim() || !selectedPairId) return;
    console.log('Adding task:', newTaskName, 'to pair:', selectedPairId);
    setNewTaskName('');
    setIsAddingTask(false);
  };

  const handleTaskClick = (pairTask: any) => {
    setSelectedTask(pairTask);
    setTaskDialogOpen(true);
  };

  const handleSubmitEvidence = async (taskId: string, evidence: { description: string; file_url?: string }) => {
    console.log('Submitting evidence for task:', taskId, evidence);
    setTaskDialogOpen(false);
  };

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Pair Checklists"
            description="View and manage checklist progress for mentoring pairs"
          />
          <ToolbarActions>
            {selectedPair && (
              <Button
                size="sm"
                onClick={() => setIsAddingTask(true)}
                disabled={isAddingTask}
              >
                <KeenIcon icon="plus" />
                Add Item
              </Button>
            )}
          </ToolbarActions>
        </Toolbar>
      </Container>

      <Container>
        <div className="grid gap-5 lg:gap-7.5">
          {/* Pair Selection */}
          <Card>
            <CardContent className="p-5">
              <div className="grid gap-2 max-w-md">
                <label className="text-xs font-bold text-gray-700 uppercase">Select Mentoring Pair</label>
                <Select value={selectedPairId} onValueChange={setSelectedPairId}>
                  <SelectTrigger className="bg-gray-50 border-gray-200">
                    <SelectValue placeholder="Choose a pair to view progress..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activePairs.map((pair) => (
                      <SelectItem key={pair.id} value={pair.id}>
                        {pair.mentor?.full_name} ↔ {pair.mentee?.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {pairsLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <KeenIcon icon="loading" className="animate-spin mb-2 text-2xl" />
              <p>Loading pairs...</p>
            </div>
          ) : selectedPair ? (
            <Fragment>
              {/* Progress Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
                <Card className="lg:col-span-2">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground uppercase mb-1">Overall Progress</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-3xl font-bold text-gray-900">{stats?.completion_percentage}%</p>
                          <span className="text-sm text-muted-foreground">
                            ({stats?.completed} of {stats?.total} tasks)
                          </span>
                        </div>
                      </div>
                      <div className="size-12 rounded-lg bg-primary-light flex items-center justify-center text-primary">
                        <KeenIcon icon="chart-line-star" className="text-2xl" />
                      </div>
                    </div>
                    <Progress value={stats?.completion_percentage} className="h-2.5" />
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5 flex flex-col justify-center">
                    <p className="text-sm text-muted-foreground mb-1">Awaiting Review</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold text-yellow-600">{stats?.awaiting_review || 0}</p>
                      <KeenIcon icon="time" className="text-yellow-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5 flex flex-col justify-center">
                    <p className="text-sm text-muted-foreground mb-1 text-success">Completed</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold text-success">{stats?.completed || 0}</p>
                      <KeenIcon icon="check-circle" className="text-success" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tasks List */}
              <Card>
                <CardHeader>
                  <CardTitle>Checklist Items</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Add New Task Form */}
                  {isAddingTask && (
                    <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                      <div className="flex items-center gap-2 max-w-2xl">
                        <Input
                          placeholder="Enter new checklist item name..."
                          className="flex-1 bg-white"
                          value={newTaskName}
                          onChange={(e) => setNewTaskName(e.target.value)}
                          autoFocus
                        />
                        <Button size="sm" onClick={handleAddTask}>
                          <KeenIcon icon="check" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          setIsAddingTask(false);
                          setNewTaskName('');
                        }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="divide-y divide-gray-100">
                    {tasksLoading ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <KeenIcon icon="loading" className="animate-spin mb-2 text-xl" />
                        <p>Loading checklist items...</p>
                      </div>
                    ) : tasks.map((pairTask) => {
                      const task = pairTask.task;
                      if (!task) return null;

                      return (
                        <div 
                          key={pairTask.id} 
                          className="p-5 hover:bg-gray-50/50 transition-colors cursor-pointer group"
                          onClick={() => handleTaskClick(pairTask)}
                        >
                          <div className="flex items-start gap-4">
                            <div className={cn('mt-1', statusColors[pairTask.status as keyof typeof statusColors])}>
                              <KeenIcon icon={statusIcons[pairTask.status as keyof typeof statusIcons]} className="text-2xl" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  {editingTask === task.id ? (
                                    <Input
                                      className="h-8 max-w-md"
                                      defaultValue={task.name}
                                      autoFocus
                                      onClick={(e) => e.stopPropagation()}
                                      onBlur={(e) => handleSaveTask(task.id, e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleSaveTask(task.id, e.currentTarget.value);
                                        } else if (e.key === 'Escape') {
                                          setEditingTask(null);
                                        }
                                      }}
                                    />
                                  ) : (
                                    <h4 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
                                      {task.name}
                                    </h4>
                                  )}
                                  {task.evidence_type && (
                                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                      <KeenIcon icon="document" className="text-[10px]" />
                                      Evidence Requirement: {task.evidence_type.name}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="xs"
                                    variant="ghost"
                                    mode="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingTask(task.id);
                                    }}
                                    disabled={editingTask === task.id}
                                  >
                                    <KeenIcon icon="pencil" className="text-xs" />
                                  </Button>
                                  <Badge 
                                    className={cn(
                                      'shrink-0 border-none capitalize',
                                      pairTask.status === 'completed' && 'bg-success text-white',
                                      pairTask.status === 'awaiting_review' && 'bg-yellow-500 text-white',
                                      pairTask.status === 'not_submitted' && 'bg-gray-100 text-gray-600'
                                    )}
                                  >
                                    {statusLabels[pairTask.status as keyof typeof statusLabels]}
                                  </Badge>
                                </div>
                              </div>

                              {/* Status update controls */}
                              <div className="mt-4 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                                {pairTask.status !== 'not_submitted' && (
                                  <Button 
                                    size="xs" 
                                    variant="outline"
                                    className="bg-gray-50 hover:bg-gray-100"
                                    onClick={() => updateStatus(pairTask.id, 'not_submitted')}
                                  >
                                    Set to Not Started
                                  </Button>
                                )}
                                {pairTask.status !== 'awaiting_review' && (
                                  <Button 
                                    size="xs" 
                                    variant="outline"
                                    className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-100"
                                    onClick={() => updateStatus(pairTask.id, 'awaiting_review')}
                                  >
                                    Set to Awaiting Review
                                  </Button>
                                )}
                                {pairTask.status !== 'completed' && (
                                  <Button 
                                    size="xs" 
                                    className="bg-success-light text-success hover:bg-success hover:text-white border-transparent"
                                    onClick={() => updateStatus(pairTask.id, 'completed')}
                                  >
                                    Mark as Completed
                                  </Button>
                                )}
                              </div>

                              {pairTask.completed_at && (
                                <p className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1">
                                  <KeenIcon icon="calendar-tick" className="text-[10px]" />
                                  Successfully verified on {new Date(pairTask.completed_at).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </Fragment>
          ) : activePairs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="size-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <KeenIcon icon="information-2" className="text-3xl text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Active Pairs Found</h3>
                <p className="text-muted-foreground text-center max-w-sm">
                  There are no active mentoring pairs in the system. You can create pairs from the Pairs management page.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="size-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <KeenIcon icon="mouse-square" className="text-3xl text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Select a Pair</h3>
                <p className="text-muted-foreground text-center max-w-sm">
                  Please select a mentoring pair from the dropdown above to view and manage their progress checklist.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </Container>

      {/* Task Dialog */}
      {selectedTask && (
        <TaskDialog
          open={taskDialogOpen}
          onOpenChange={setTaskDialogOpen}
          task={{
            id: selectedTask.id,
            name: selectedTask.task?.name || 'Unknown Task',
            status: selectedTask.status,
            description: selectedTask.task?.description,
            evidence_type: selectedTask.task?.evidence_type,
            completed_at: selectedTask.completed_at,
          }}
          pairId={selectedPairId || ''}
          onSubmitEvidence={handleSubmitEvidence}
          onUpdateStatus={updateStatus}
        />
      )}
    </Fragment>
  );
}
