import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMasterSubTasks, type MasterSubTask } from '@/lib/api/tasks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubTaskRowProps {
  taskId: string;
  isExpanded: boolean;
  onToggle: () => void;
  onManageSubTasks: () => void;
}

export function SubTaskRow({ taskId, isExpanded, onToggle, onManageSubTasks }: SubTaskRowProps) {
  const { data: subtasks = [], isLoading } = useQuery({
    queryKey: ['master-subtasks', taskId],
    queryFn: () => fetchMasterSubTasks(taskId),
    enabled: isExpanded,
  });

  if (!isExpanded) {
    return (
      <div className="flex items-center gap-2">
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="h-6 px-2 text-xs"
        >
          <List className="w-3 h-3 mr-1" />
          View Subtasks
        </Button>
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
          className="h-6 px-2 text-xs"
        >
          <List className="w-3 h-3 mr-1" />
          Hide Subtasks ({subtasks.length})
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onManageSubTasks}
          className="h-6 px-2 text-xs"
        >
          <PlusCircle className="w-3 h-3 mr-1" />
          Manage
        </Button>
      </div>
      
      {isLoading ? (
        <div className="pl-8 text-sm text-muted-foreground">Loading subtasks...</div>
      ) : subtasks.length === 0 ? (
        <div className="pl-8 text-sm text-muted-foreground">No subtasks found</div>
      ) : (
        <div className="pl-8 space-y-1">
          {subtasks.map((subtask) => (
            <div key={subtask.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <div className="text-sm font-medium">{subtask.name}</div>
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
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => {/* TODO: Implement edit */}}
                >
                  <Edit className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                  onClick={() => {/* TODO: Implement delete */}}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
