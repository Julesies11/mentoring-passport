-- Update notification types check constraint to include new types
-- Resolves "violates check constraint mp_notifications_type_check" (Error 23514)

-- 1. Drop existing constraint
ALTER TABLE mp_notifications DROP CONSTRAINT IF EXISTS mp_notifications_type_check;

-- 2. Add updated constraint with all current types
ALTER TABLE mp_notifications ADD CONSTRAINT mp_notifications_type_check 
CHECK (type IN (
  'evidence_uploaded',
  'evidence_approved',
  'evidence_rejected',
  'note_added',
  'meeting_created',
  'meeting_updated',
  'pair_created',
  'pair_archived',
  'guidance_added',
  'task_completed',
  -- New types introduced for Gold Standard system:
  'task_submitted',
  'milestone_50',
  'pair_completed',
  'profile_completed',
  'stagnation_alert'
));
