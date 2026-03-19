/**
 * Centralized constants and Enums for the Mentoring Passport application.
 * These are aligned with the PostgreSQL database constraints.
 */

/**
 * User roles within the application
 * Aligned with mp_profiles.role check constraint
 */
export const ROLES = {
  ADMINISTRATOR: 'administrator',
  ORG_ADMIN: 'org-admin',
  SUPERVISOR: 'supervisor',
  PROGRAM_MEMBER: 'program-member',
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

/**
 * Program Status
 * Aligned with mp_programs.status check constraint
 */
export const PROGRAM_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
} as const;

export type ProgramStatus = typeof PROGRAM_STATUS[keyof typeof PROGRAM_STATUS];

/**
 * Profile Status
 * Aligned with mp_profiles.status check constraint
 */
export const PROFILE_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
} as const;

export type ProfileStatus = typeof PROFILE_STATUS[keyof typeof PROFILE_STATUS];

/**
 * Pair Status
 * Aligned with mp_pairs.status check constraint
 */
export const PAIR_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
} as const;

export type PairStatus = typeof PAIR_STATUS[keyof typeof PAIR_STATUS];

/**
 * Task Status (for Pair Tasks)
 * Aligned with mp_pair_tasks.status check constraint
 */
export const TASK_STATUS = {
  NOT_SUBMITTED: 'not_submitted',
  AWAITING_REVIEW: 'awaiting_review',
  COMPLETED: 'completed',
  REVISION_REQUIRED: 'revision_required',
} as const;

export type TaskStatus = typeof TASK_STATUS[keyof typeof TASK_STATUS];

/**
 * Evidence Status
 * Aligned with mp_evidence_uploads.status check constraint
 */
export const EVIDENCE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type EvidenceStatus = typeof EVIDENCE_STATUS[keyof typeof EVIDENCE_STATUS];

/**
 * Meeting Status
 * Aligned with mp_meetings.status check constraint
 */
export const MEETING_STATUS = {
  UPCOMING: 'upcoming',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type MeetingStatus = typeof MEETING_STATUS[keyof typeof MEETING_STATUS];

/**
 * Meeting Location Types
 * Aligned with mp_meetings.location_type check constraint
 */
export const LOCATION_TYPE = {
  IN_PERSON: 'in-person',
  VIDEO: 'video',
  PHONE: 'phone',
  OTHER: 'other',
} as const;

export type LocationType = typeof LOCATION_TYPE[keyof typeof LOCATION_TYPE];

/**
 * Evidence Revision Status
 * Aligned with mp_evidence_uploads.revision_status check constraint
 */
export const REVISION_STATUS = {
  PENDING: 'pending',
  SUBMITTED: 'submitted',
  NONE: 'none',
} as const;

export type RevisionStatus = typeof REVISION_STATUS[keyof typeof REVISION_STATUS];

/**
 * Supabase Storage buckets
 */
export const STORAGE_BUCKETS = {
  AVATARS: 'mp-avatars',
  EVIDENCE: 'mp-evidence-photos',
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
export const PAIR_STATUS_COLORS: Record<PairStatus, string> = {
  [PAIR_STATUS.ACTIVE]: 'bg-green-100 text-green-800 border-green-200',
  [PAIR_STATUS.COMPLETED]: 'bg-blue-100 text-blue-800 border-blue-200',
  [PAIR_STATUS.ARCHIVED]: 'bg-gray-100 text-gray-800 border-gray-200',
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  [TASK_STATUS.NOT_SUBMITTED]: 'bg-gray-100 text-gray-700',
  [TASK_STATUS.AWAITING_REVIEW]: 'bg-warning-light text-warning',
  [TASK_STATUS.COMPLETED]: 'bg-success-light text-success',
  [TASK_STATUS.REVISION_REQUIRED]: 'bg-danger-light text-danger',
};

/**
 * LEGACY STATUS (For compatibility during refactor)
 */
export const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
  COMPLETED: 'completed',
} as const;

export type EntityStatus = typeof STATUS[keyof typeof STATUS];
