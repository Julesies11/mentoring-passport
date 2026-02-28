import { ChevronDown, ChevronRight, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { KeenIcon } from '@/components/keenicons';

interface SubTaskRowProps {
  taskId: string;
  subtasks?: any[];
  isExpanded: boolean;
  onToggle: () => void;
  mode?: 'setup' | 'progress';
}

export function SubTaskRow({
  taskId,
  subtasks = [],
  isExpanded,
  onToggle,
  mode = 'setup',
}: SubTaskRowProps) {
  const subtaskCount = subtasks.length;

  if (!isExpanded) {
    return (
      <div className="flex items-center gap-2">
        {subtaskCount > 0 ? (
          <>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="h-6 px-2 text-xs text-primary hover:bg-primary/10"
            >
              <List className="w-3 h-3 mr-1" />
              {subtaskCount} {subtaskCount === 1 ? 'Subtask' : 'Subtasks'}
            </Button>
          </>
        ) : (
          <div className="flex items-center gap-2 pl-6">
            <span className="text-[10px] text-muted-foreground italic uppercase tracking-wider">
              No subtasks
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="h-6 px-2 text-xs font-semibold text-gray-700 bg-gray-100"
        >
          <List className="w-3 h-3 mr-1" />
          Hide {subtaskCount} {subtaskCount === 1 ? 'Subtask' : 'Subtasks'}
        </Button>
      </div>

      <div className="pl-8 space-y-1 border-l-2 border-gray-100 ml-2 mt-2">
        {subtasks.map((subtask) => (
          <div
            key={subtask.id}
            className="flex items-center justify-between p-2 hover:bg-gray-50 rounded transition-colors group h-9"
          >
            <div className="flex items-center gap-3">
              {mode === 'progress' && subtask.is_completed !== undefined ? (
                <KeenIcon
                  icon="check-square"
                  className={cn(
                    'text-base',
                    subtask.is_completed ? 'text-success' : 'text-gray-300',
                  )}
                />
              ) : (
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full group-hover:bg-primary transition-colors"></div>
              )}
              <div>
                <div className="text-sm text-gray-700 font-medium">
                  {subtask.name}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
