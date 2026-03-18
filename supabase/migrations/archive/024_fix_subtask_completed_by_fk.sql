-- Migration to fix foreign key relationship for mp_pair_subtasks
-- Change completed_by_id to reference mp_profiles instead of auth.users

DO $$
BEGIN
  -- Drop existing foreign key if it exists
  ALTER TABLE IF EXISTS mp_pair_subtasks 
  DROP CONSTRAINT IF EXISTS mp_pair_subtasks_completed_by_id_fkey;

  -- Add new foreign key referencing mp_profiles
  ALTER TABLE mp_pair_subtasks
  ADD CONSTRAINT mp_pair_subtasks_completed_by_id_fkey 
  FOREIGN KEY (completed_by_id) REFERENCES mp_profiles(id) ON DELETE SET NULL;

  -- Add comment for documentation
  COMMENT ON CONSTRAINT mp_pair_subtasks_completed_by_id_fkey ON mp_pair_subtasks IS 'Profile of the user who completed this subtask';
END $$;
