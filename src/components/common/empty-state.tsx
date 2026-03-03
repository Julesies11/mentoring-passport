import React, { ReactNode } from 'react';
import { KeenIcon } from '@/components/keenicons';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  className?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon = 'document',
  title,
  description,
  className,
  action,
}: EmptyStateProps) {
  return (
    <div className={cn("text-center py-12 flex flex-col items-center justify-center", className)}>
      <div className="size-16 rounded-full bg-gray-50 flex items-center justify-center mb-4 text-gray-300">
        <KeenIcon icon={icon} className="text-4xl" />
      </div>
      <h4 className="text-base font-bold text-gray-900">{title}</h4>
      <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1 mb-6">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
