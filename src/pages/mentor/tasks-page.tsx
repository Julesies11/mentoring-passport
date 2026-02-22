import { useAuth } from '@/auth/context/auth-context';
import { useUserPairs } from '@/hooks/use-pairs';
import { usePairTasks } from '@/hooks/use-tasks';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, Clock } from 'lucide-react';
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

export function TasksPage() {
  const { user } = useAuth();
  const { data: pairs = [], isLoading: pairsLoading } = useUserPairs(user?.id || '');
  const activePair = pairs.find(p => p.status === 'active');
  
  const { tasks, stats, isLoading: tasksLoading } = usePairTasks(activePair?.id || '');

  if (pairsLoading || tasksLoading) {
    return (
      <div className="container-fixed">
        <div className="text-center py-12 text-muted-foreground">
          Loading tasks...
        </div>
      </div>
    );
  }

  if (!activePair) {
    return (
      <div className="container-fixed">
        <div className="card p-12 text-center">
          <h2 className="text-xl font-semibold mb-2">No Active Pairing</h2>
          <p className="text-muted-foreground">
            You haven't been paired with a mentee yet. Please contact your supervisor.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fixed">
      <div className="flex flex-col gap-5 lg:gap-7.5">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-600 mt-1">
            Track progress with {activePair.mentee?.full_name || 'your mentee'}
          </p>
        </div>

        {stats && (
          <div className="card p-6">
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
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card p-5">
            <p className="text-sm text-muted-foreground mb-1">Not Started</p>
            <p className="text-2xl font-bold">{stats?.not_submitted || 0}</p>
          </div>
          <div className="card p-5">
            <p className="text-sm text-muted-foreground mb-1">Awaiting Review</p>
            <p className="text-2xl font-bold text-yellow-600">{stats?.awaiting_review || 0}</p>
          </div>
          <div className="card p-5">
            <p className="text-sm text-muted-foreground mb-1">Completed</p>
            <p className="text-2xl font-bold text-green-600">{stats?.completed || 0}</p>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Mentoring Tasks</h3>
          </div>
          <div className="card-body p-0">
            <div className="divide-y">
              {tasks.map((pairTask) => {
                const task = pairTask.task;
                if (!task) return null;

                const StatusIcon = statusIcons[pairTask.status];

                return (
                  <div key={pairTask.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={cn('mt-1', statusColors[pairTask.status])}>
                        <StatusIcon className="w-6 h-6" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-medium mb-1">{task.name}</h4>
                            {task.evidence_type && (
                              <p className="text-sm text-muted-foreground">
                                Evidence: {task.evidence_type.name}
                              </p>
                            )}
                          </div>
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
          </div>
        </div>
      </div>
    </div>
  );
}
