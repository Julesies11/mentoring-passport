import { Fragment, useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useUserPairs } from '@/hooks/use-pairs';
import { usePairTasks } from '@/hooks/use-tasks';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { KeenIcon } from '@/components/keenicons';
import { cn } from '@/lib/utils';
import { TaskDialog } from '@/components/tasks/task-dialog';
import { PairSubTasksDisplay } from '@/components/tasks/pair-subtasks-display';
import { useSearchParams } from 'react-router-dom';

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

export function TasksPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const selectedMenteeId = searchParams.get('mentee');
  
  const { data: pairs = [], isLoading: pairsLoading } = useUserPairs(user?.id || '');
  
  // Find pair based on URL parameter or default to active pair
  const selectedPair = selectedMenteeId 
    ? pairs.find(p => p.mentee?.id === selectedMenteeId)
    : pairs.find(p => p.status === 'active');
  
  const { tasks, stats, isLoading: tasksLoading } = usePairTasks(selectedPair?.id || '');
  
  // State for task dialog
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);

  const handleTaskClick = (pairTask: any) => {
    setSelectedTask(pairTask);
    setIsTaskDialogOpen(true);
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
                {selectedMenteeId 
                  ? "No mentoring relationship found for the selected mentee."
                  : "You don't have an active mentoring relationship at the moment."
                }
              </p>
            </CardContent>
          </Card>
        </Container>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Tasks"
            description={`Track progress with ${selectedPair.mentee?.full_name || 'your mentee'}${selectedMenteeId ? ' (selected)' : ''}`}
          />
          <ToolbarActions>
            {/* Actions can be added here */}
          </ToolbarActions>
        </Toolbar>
      </Container>

      <Container>
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
                  <div className="size-12 rounded-lg bg-primary-light flex items-center justify-center text-primary">
                    <KeenIcon icon="chart-line-star" className="text-2xl" />
                  </div>
                </div>
                <Progress value={stats.completion_percentage} className="h-2.5" />
              </CardContent>
            </Card>
          )}

          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground mb-1">Not Started</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{stats?.not_submitted || 0}</p>
                  <KeenIcon icon="circle" className="text-gray-300" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground mb-1 text-yellow-600">Awaiting Review</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-yellow-600">{stats?.awaiting_review || 0}</p>
                  <KeenIcon icon="time" className="text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
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
              <CardTitle>Mentoring Tasks</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {tasks.map((pairTask) => {
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
                              <h4 className="font-semibold text-gray-900 group-hover:text-primary transition-colors mb-1">
                                {task.name}
                              </h4>
                              {task.evidence_type && (
                                <div className="flex items-center gap-1.5">
                                  <KeenIcon icon="document" className="text-muted-foreground text-sm" />
                                  <span className="text-xs text-muted-foreground">
                                    Evidence required: {task.evidence_type.name}
                                  </span>
                                </div>
                              )}
                            </div>
                            <Badge 
                              className={cn(
                                'shrink-0 capitalize border-none',
                                pairTask.status === 'completed' && 'bg-success text-white',
                                pairTask.status === 'awaiting_review' && 'bg-yellow-500 text-white',
                                pairTask.status === 'not_submitted' && 'bg-gray-100 text-gray-600'
                              )}
                            >
                              {statusLabels[pairTask.status as keyof typeof statusLabels]}
                            </Badge>
                          </div>

                          {pairTask.completed_at && (
                            <div className="flex items-center gap-1.5 mt-2">
                              <KeenIcon icon="calendar" className="text-muted-foreground text-xs" />
                              <span className="text-xs text-muted-foreground">
                                Completed on {new Date(pairTask.completed_at).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          
                          {/* Subtasks Display */}
                          {pairTask.subtasks && pairTask.subtasks.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-100 border-dashed">
                              <PairSubTasksDisplay
                                subtasks={pairTask.subtasks}
                                pairTaskId={pairTask.id}
                              />
                            </div>
                          )}
                        </div>
                        <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <KeenIcon icon="right" className="text-gray-400" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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
            id: selectedTask.task?.id || '',
            name: selectedTask.task?.name || '',
            status: selectedTask.status,
            description: selectedTask.task?.description,
            evidence_type: selectedTask.task?.evidence_type,
            completed_at: selectedTask.completed_at,
          }}
          pairId={selectedPair?.id || ''}
          onSubmitEvidence={(taskId, evidence) => {
            console.log('Submitting evidence for task:', taskId, evidence);
          }}
          onUpdateStatus={(taskId, status) => {
            console.log('Updating status for task:', taskId, status);
          }}
        />
      )}
    </Fragment>
  );
}

