import { useState, useEffect } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useAllPairs } from '@/hooks/use-pairs';
import { usePairTasks } from '@/hooks/use-tasks';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Circle, Clock, Edit2, Plus, Save, X, FileText } from 'lucide-react';
import { TaskDialog } from '@/components/tasks/task-dialog';
import { cn } from '@/lib/utils';

const statusIcons = {
  not_submitted: Circle,
  awaiting_review: Clock,
  completed: CheckCircle,
};

const statusColors = {
  not_submitted: 'text-gray-400',
  awaiting_review: 'text-yellow-500',
  completed: 'text-green-500',
};

const statusLabels = {
  not_submitted: 'Not Started',
  awaiting_review: 'Awaiting Review',
  completed: 'Completed',
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
    // TODO: Implement task update API call
    console.log('Saving task:', taskId, newName);
    setEditingTask(null);
  };

  const handleAddTask = async () => {
    if (!newTaskName.trim() || !selectedPairId) return;
    
    // TODO: Implement task creation API call
    console.log('Adding task:', newTaskName, 'to pair:', selectedPairId);
    setNewTaskName('');
    setIsAddingTask(false);
  };

  const handleTaskClick = (pairTask: any) => {
    setSelectedTask(pairTask);
    setTaskDialogOpen(true);
  };

  const handleSubmitEvidence = async (taskId: string, evidence: { description: string; file_url?: string }) => {
    // TODO: Implement evidence submission API call
    console.log('Submitting evidence for task:', taskId, evidence);
    setTaskDialogOpen(false);
  };

  if (pairsLoading) {
    return (
      <div className="container-fixed">
        <div className="text-center py-12 text-muted-foreground">
          Loading pairs...
        </div>
      </div>
    );
  }

  return (
    <div className="container-fixed">
      <div className="flex flex-col gap-5 lg:gap-7.5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Pair Checklists</h1>
            <p className="text-sm text-gray-600 mt-1">
              View and manage checklist progress for mentoring pairs
            </p>
          </div>
        </div>

        {/* Pair Selection */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Select Pair</label>
                <Select value={selectedPairId} onValueChange={setSelectedPairId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a mentoring pair..." />
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
            </div>
          </CardContent>
        </Card>

        {selectedPair && (
          <>
            {/* Progress Overview */}
            {stats && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Overall Progress</p>
                      <p className="text-3xl font-bold mt-1">{stats.completion_percentage}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {stats.completed} of {stats.total} completed
                      </p>
                    </div>
                  </div>
                  <Progress value={stats.completion_percentage} className="h-3" />
                </CardContent>
              </Card>
            )}

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground mb-1">Not Started</p>
                  <p className="text-2xl font-bold">{stats?.not_submitted || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground mb-1">Awaiting Review</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats?.awaiting_review || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground mb-1">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{stats?.completed || 0}</p>
                </CardContent>
              </Card>
            </div>

            {/* Tasks List */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Checklist Items</CardTitle>
                <Button
                  size="sm"
                  onClick={() => setIsAddingTask(true)}
                  disabled={isAddingTask}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {/* Add New Task Form */}
                {isAddingTask && (
                  <div className="p-4 border-b bg-muted/50">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Enter new checklist item..."
                        className="flex-1 px-3 py-2 border rounded-md text-sm"
                        value={newTaskName}
                        onChange={(e) => setNewTaskName(e.target.value)}
                        autoFocus
                      />
                      <Button size="sm" onClick={handleAddTask}>
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        setIsAddingTask(false);
                        setNewTaskName('');
                      }}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="divide-y">
                  {tasks.map((pairTask) => {
                    const task = pairTask.task;
                    if (!task) return null;

                    const StatusIcon = statusIcons[pairTask.status];

                    return (
                      <div 
                        key={pairTask.id} 
                        className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => handleTaskClick(pairTask)}
                      >
                        <div className="flex items-start gap-4">
                          <div className={cn('mt-1', statusColors[pairTask.status])}>
                            <StatusIcon className="w-6 h-6" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                {editingTask === task.id ? (
                                  <input
                                    type="text"
                                    className="w-full px-2 py-1 border rounded text-sm"
                                    defaultValue={task.name}
                                    autoFocus
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
                                  <h4 className="font-medium mb-1">{task.name}</h4>
                                )}
                                {task.evidence_type && (
                                  <p className="text-sm text-muted-foreground">
                                    Evidence: {task.evidence_type.name}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingTask(task.id);
                                  }}
                                  disabled={editingTask === task.id}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Badge 
                                  className={cn(
                                    'shrink-0',
                                    pairTask.status === 'completed' && 'bg-green-100 text-green-800',
                                    pairTask.status === 'awaiting_review' && 'bg-yellow-100 text-yellow-800',
                                    pairTask.status === 'not_submitted' && 'bg-gray-100 text-gray-800'
                                  )}
                                >
                                  {statusLabels[pairTask.status]}
                                </Badge>
                              </div>
                            </div>

                            {/* Supervisor can update status */}
                            <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                              {pairTask.status !== 'not_submitted' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateStatus(pairTask.id, 'not_submitted');
                                  }}
                                >
                                  Mark as Not Started
                                </Button>
                              )}
                              {pairTask.status !== 'awaiting_review' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateStatus(pairTask.id, 'awaiting_review');
                                  }}
                                >
                                  Mark as Awaiting Review
                                </Button>
                              )}
                              {pairTask.status !== 'completed' && (
                                <Button 
                                  size="sm" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateStatus(pairTask.id, 'completed');
                                  }}
                                >
                                  Mark as Completed
                                </Button>
                              )}
                            </div>

                            {pairTask.completed_at && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Completed on {new Date(pairTask.completed_at).toLocaleDateString()}
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
          </>
        )}

        {!selectedPair && activePairs.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <h3 className="text-lg font-semibold mb-2">No Active Pairs</h3>
              <p className="text-muted-foreground">
                There are no active mentoring pairs to display checklists for.
              </p>
            </CardContent>
          </Card>
        )}

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
      </div>
    </div>
  );
}
