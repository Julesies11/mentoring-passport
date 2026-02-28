-- Ensure evidence_type_id is NOT NULL in pair tasks and subtasks
-- First, find or create a fallback evidence type
DO $$
DECLARE
  fallback_id UUID;
BEGIN
  SELECT id INTO fallback_id FROM mp_evidence_types WHERE name = 'Not Applicable' LIMIT 1;
  
  IF fallback_id IS NULL THEN
    fallback_id := gen_random_uuid();
    INSERT INTO mp_evidence_types (id, name, requires_submission)
    VALUES (fallback_id, 'Not Applicable', false);
  END IF;

  -- Update any nulls to the fallback before enforcing NOT NULL
  UPDATE mp_pair_tasks SET evidence_type_id = fallback_id WHERE evidence_type_id IS NULL;
  UPDATE mp_pair_subtasks SET evidence_type_id = fallback_id WHERE evidence_type_id IS NULL;
END $$;

-- Enforce NOT NULL constraints
ALTER TABLE mp_pair_tasks ALTER COLUMN evidence_type_id SET NOT NULL;
ALTER TABLE mp_pair_subtasks ALTER COLUMN evidence_type_id SET NOT NULL;

-- Fix the unique constraint on mp_pair_tasks
-- We only want the uniqueness if master_task_id is NOT NULL
-- (To prevent duplicate template tasks, but allow multiple custom tasks)
ALTER TABLE mp_pair_tasks DROP CONSTRAINT IF EXISTS unique_pair_task;
DROP INDEX IF EXISTS idx_mp_pair_tasks_pair_master_task;
CREATE UNIQUE INDEX idx_mp_pair_tasks_pair_master_task ON mp_pair_tasks (pair_id, master_task_id) WHERE master_task_id IS NOT NULL;
