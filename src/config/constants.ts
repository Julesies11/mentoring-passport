/**
 * Centralized constants for the Mentoring Passport application.
 * Use these constants instead of hardcoded strings to ensure consistency,
 * enable IDE autocompletion, and simplify refactoring.
 */

/**
 * User roles within the application
 */
export const ROLES = {
  ADMINISTRATOR: 'administrator',
  ORG_ADMIN: 'org-admin',
  SUPERVISOR: 'supervisor',
  PROGRAM_MEMBER: 'program-member',
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

/**
 * General entity statuses (Profiles, Programs, Pairs)
 */
export const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
  COMPLETED: 'completed',
} as const;

export type EntityStatus = typeof STATUS[keyof typeof STATUS];

/**
 * Task and Subtask specific statuses
 */
export const TASK_STATUS = {
  NOT_SUBMITTED: 'not_submitted',
  AWAITING_REVIEW: 'awaiting_review',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
} as const;

export type TaskStatus = typeof TASK_STATUS[keyof typeof TASK_STATUS];

/**
 * Supabase Storage buckets
 */
export const STORAGE_BUCKETS = {
  AVATARS: 'mp-avatars',
  EVIDENCE: 'mp-evidence',
  LOGOS: 'mp-logos',
} as const;

export type StorageBucket = typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS];

/**
 * Log and Notification severity levels
 */
export const SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
} as const;

export type SeverityLevel = typeof SEVERITY[keyof typeof SEVERITY];

/**
 * Visual/UI Constants
 */
export const PAIR_STATUS_COLORS: Record<EntityStatus | string, string> = {
  [STATUS.ACTIVE]: 'bg-green-100 text-green-800 border-green-200',
  [STATUS.COMPLETED]: 'bg-blue-100 text-blue-800 border-blue-200',
  [STATUS.ARCHIVED]: 'bg-gray-100 text-gray-800 border-gray-200',
};

export const TASK_STATUS_COLORS: Record<TaskStatus | string, string> = {
  [TASK_STATUS.NOT_SUBMITTED]: 'bg-gray-100 text-gray-700',
  [TASK_STATUS.AWAITING_REVIEW]: 'bg-warning-light text-warning',
  [TASK_STATUS.COMPLETED]: 'bg-success-light text-success',
  [TASK_STATUS.REJECTED]: 'bg-danger-light text-danger',
};
