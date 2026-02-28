import { useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ChevronDown, ChevronRight, Circle } from 'lucide-react';
import { togglePairSubTaskCompletion, type PairSubTask } from '@/lib/api/tasks';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface PairSubTasksDisplayProps {
  subtasks: PairSubTask[];
  pairTaskId: string;
}

export function PairSubTasksDisplay({
  subtasks,
  pairTaskId,
}: PairSubTasksDisplayProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const toggleSubTaskMutation = useMutation({
    mutationFn: ({
      subtaskId,
      isCompleted,
    }: {
      subtaskId: string;
      isCompleted: boolean;
    }) => togglePairSubTaskCompletion(subtaskId, isCompleted, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pair-tasks'] });
    },
  });

  const handleToggleSubTask = (subtaskId: string, isCompleted: boolean) => {
    toggleSubTaskMutation.mutate({ subtaskId, isCompleted });
  };

  const completedCount = subtasks.filter((st) => st.is_completed).length;
  const totalCount = subtasks.length;

  if (subtasks.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="h-6 px-2 text-xs"
        >
          {expanded ? (
            <ChevronDown className="w-3 h-3 mr-1" />
          ) : (
            <ChevronRight className="w-3 h-3 mr-1" />
          )}
          Subtasks ({completedCount}/{totalCount})
        </Button>
        <Badge
          variant={completedCount === totalCount ? 'default' : 'secondary'}
          className="text-xs"
        >
          {Math.round((completedCount / totalCount) * 100)}%
        </Badge>
      </div>

      {expanded && (
        <div className="pl-4 space-y-2 border-l-2 border-muted">
          {subtasks.map((subtask) => (
            <div
              key={subtask.id}
              className="flex items-center justify-between p-2 bg-muted/30 rounded"
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={subtask.is_completed}
                  onCheckedChange={(checked) =>
                    handleToggleSubTask(subtask.id, !!checked)
                  }
                  disabled={toggleSubTaskMutation.isPending}
                />
                <div className="flex items-center gap-2">
                  {subtask.is_completed ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <Circle className="w-4 h-4 text-gray-400" />
                  )}
                  <div>
                    <div
                      className={cn(
                        'text-sm font-medium',
                        subtask.is_completed &&
                          'line-through text-muted-foreground',
                      )}
                    >
                      {subtask.name}
                    </div>
                    {subtask.evidence_type && (
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {subtask.evidence_type.name}
                        </Badge>
                        {subtask.evidence_type.requires_submission && (
                          <Badge variant="destructive" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                    )}
                    {subtask.completed_at && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Completed{' '}
                        {new Date(subtask.completed_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
