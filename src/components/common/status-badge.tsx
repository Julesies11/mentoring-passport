import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PAIR_STATUS_COLORS, TASK_STATUS_COLORS } from '@/config/constants';

type BadgeContext = 'pair' | 'task';

export interface StatusBadgeProps {
  status: string;
  context: BadgeContext;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, context, label, className }: StatusBadgeProps) {
  const getColors = () => {
    if (context === 'pair') {
      return PAIR_STATUS_COLORS[status as keyof typeof PAIR_STATUS_COLORS] || 'bg-gray-100 text-gray-600';
    }
    if (context === 'task') {
      return TASK_STATUS_COLORS[status as keyof typeof TASK_STATUS_COLORS] || 'bg-gray-100 text-gray-700';
    }
    return 'bg-gray-100 text-gray-700';
  };

  const getLabel = () => {
    if (label) return label;
    // Format "revision_required" to "Revision Required"
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(
        'font-black uppercase text-[10px] px-2.5 h-5 border-none shadow-sm rounded-full', 
        getColors(),
        className
      )}
    >
      {getLabel()}
    </Badge>
  );
}
