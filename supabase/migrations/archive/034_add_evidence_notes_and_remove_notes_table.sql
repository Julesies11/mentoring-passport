-- Migration to add evidence_notes to mp_pair_tasks and remove mp_notes table
DO $$
BEGIN
  -- 1. Add evidence_notes column to mp_pair_tasks if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mp_pair_tasks' AND column_name = 'evidence_notes') THEN
    ALTER TABLE mp_pair_tasks ADD COLUMN evidence_notes TEXT;
  END IF;

  -- 2. Drop the mp_notes table if it exists
  DROP TABLE IF EXISTS mp_notes CASCADE;

END $$;
