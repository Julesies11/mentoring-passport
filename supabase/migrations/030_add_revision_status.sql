-- Migration to add revision_required status and feedback column to pair tasks
DO $$
BEGIN
  -- 1. Add last_feedback column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mp_pair_tasks' AND column_name = 'last_feedback') THEN
    ALTER TABLE mp_pair_tasks ADD COLUMN last_feedback TEXT;
  END IF;

  -- 2. Update status check constraint to include revision_required
  -- We have to drop and recreate the constraint
  ALTER TABLE mp_pair_tasks DROP CONSTRAINT IF EXISTS mp_pair_tasks_status_check;
  ALTER TABLE mp_pair_tasks ADD CONSTRAINT mp_pair_tasks_status_check 
    CHECK (status IN ('not_submitted', 'awaiting_review', 'completed', 'revision_required'));

END $$;
