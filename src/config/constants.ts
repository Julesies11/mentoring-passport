// Centralized constants for the application

export const PAIR_STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800 border-green-200',
  completed: 'bg-blue-100 text-blue-800 border-blue-200',
  archived: 'bg-gray-100 text-gray-800 border-gray-200',
};

export const TASK_STATUS_COLORS: Record<string, string> = {
  not_submitted: 'bg-gray-100 text-gray-700',
  awaiting_review: 'bg-warning-light text-warning',
  completed: 'bg-success-light text-success',
};
