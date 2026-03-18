-- Migration to add rejection_reason to mp_pair_tasks
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mp_pair_tasks' AND column_name = 'rejection_reason') THEN
    ALTER TABLE mp_pair_tasks ADD COLUMN rejection_reason TEXT;
  END IF;
END $$;
