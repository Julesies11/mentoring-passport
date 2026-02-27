import { useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useUserPairs } from '@/hooks/use-pairs';
import { usePairTasks } from '@/hooks/use-tasks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KeenIcon } from '@/components/keenicons';
import { cn } from '@/lib/utils';
import { TaskDialog } from '@/components/tasks/task-dialog';
import { PairSubTasksDisplay } from '@/components/tasks/pair-subtasks-display';

const statusIcons = {
  not_submitted: 'circle',
  awaiting_review: 'time',
  completed: 'check-circle',
};

const statusColors = {
  not_submitted: 'text-gray-400',
  awaiting_review: 'text-warning',
  completed: 'text-success',
};

const statusLabels = {
  not_submitted: 'Not Started',
  awaiting_review: 'Awaiting Review',
  completed: 'Completed',
};

export function ChecklistContent() {
  const { user } = useAuth();
  const { data: pairs = [], isLoading: pairsLoading } = useUserPairs(user?.id || '');
  const activePair = pairs.find(p => p.status === 'active');
  
  const { tasks, stats, isLoading: tasksLoading, updateStatus } = usePairTasks(activePair?.id || '');
  
  // State for task dialog
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);

  const handleTaskClick = (pairTask: any) => {
    setSelectedTask(pairTask);
    setIsTaskDialogOpen(true);
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground mb-1">Not Started</p>
            <div className="flex items-center gap-2">
                <KeenIcon icon="circle" className="text-xl text-gray-400" />
                <p className="text-2xl font-bold">{stats?.not_submitted || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground mb-1">Awaiting Review</p>
            <div className="flex items-center gap-2">
                <KeenIcon icon="time" className="text-xl text-warning" />
                <p className="text-2xl font-bold text-warning">{stats?.awaiting_review || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground mb-1">Completed</p>
            <div className="flex items-center gap-2">
                <KeenIcon icon="check-circle" className="text-xl text-success" />
                <p className="text-2xl font-bold text-success">{stats?.completed || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mentoring Tasks</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {tasks.map((pairTask) => {
              const task = pairTask.task;
              if (!task) return null;

              const statusIcon = statusIcons[pairTask.status as keyof typeof statusIcons];

              return (
                <div 
                  key={pairTask.id} 
                  className="p-5 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => handleTaskClick(pairTask)}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn('mt-1', statusColors[pairTask.status as keyof typeof statusColors])}>
                      <KeenIcon icon={statusIcon} className="text-2xl" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="text-base font-semibold text-gray-900 mb-1">{task.name}</h4>
                          {task.evidence_type && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                              <KeenIcon icon="file-up" className="text-sm" />
                              Evidence: {task.evidence_type.name}
                            </p>
                          )}
                        </div>
                        <Badge 
                          variant="outline"
                          className={cn(
                            'shrink-0 font-medium',
                            pairTask.status === 'completed' && 'bg-success-light text-success border-success/20',
                            pairTask.status === 'awaiting_review' && 'bg-warning-light text-warning border-warning/20',
                            pairTask.status === 'not_submitted' && 'bg-secondary text-secondary-foreground'
                          )}
                        >
                          {statusLabels[pairTask.status as keyof typeof statusLabels]}
                        </Badge>
                      </div>

                      {pairTask.status === 'not_submitted' && (
                        <div className="mt-4">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="bg-primary-light text-primary hover:bg-primary hover:text-white border-transparent"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateStatus(pairTask.id, 'awaiting_review');
                            }}
                          >
                            Submit for Review
                          </Button>
                        </div>
                      )}

                      {pairTask.completed_at && (
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <KeenIcon icon="calendar-tick" className="text-xs" />
                          Completed on {new Date(pairTask.completed_at).toLocaleDateString()}
                        </p>
                      )}
                      
                      {/* Subtasks Display */}
                      {pairTask.subtasks && pairTask.subtasks.length > 0 && (
                        <div className="mt-4" onClick={(e) => e.stopPropagation()}>
                          <PairSubTasksDisplay
                            subtasks={pairTask.subtasks}
                            pairTaskId={pairTask.id}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Task Dialog */}
      {selectedTask && (
        <TaskDialog
          open={isTaskDialogOpen}
          onOpenChange={setIsTaskDialogOpen}
          task={{
            id: selectedTask.task?.id || '',
            name: selectedTask.task?.name || '',
            status: selectedTask.status,
            description: selectedTask.task?.description,
            evidence_type: selectedTask.task?.evidence_type,
            completed_at: selectedTask.completed_at,
          }}
          pairId={activePair?.id || ''}
          onSubmitEvidence={(taskId, evidence) => {
            console.log('Submitting evidence for task:', taskId, evidence);
          }}
          onUpdateStatus={(taskId, status) => {
            console.log('Updating status for task:', taskId, status);
          }}
        />
      )}
    </div>
  );
}
