export interface ProgressStats {
  completed: number;
  total: number;
  formatted: string;
  percentage: number;
}

/**
 * Calculates the progress of a pair based on their tasks.
 * @param pairId The ID of the pair.
 * @param allTasks An array of tasks, where each task has a `pair_id` and `status`.
 * @returns ProgressStats object containing completed count, total count, formatted string, and percentage.
 */
export function calculatePairProgress(pairId: string, allTasks: any[]): ProgressStats {
  const pairTasks = allTasks.filter(s => s.pair_id === pairId);
  const total = pairTasks.length;
  const completed = pairTasks.filter(s => s.status === 'completed').length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  return { 
    completed, 
    total, 
    formatted: `${completed}/${total}`,
    percentage
  };
}
