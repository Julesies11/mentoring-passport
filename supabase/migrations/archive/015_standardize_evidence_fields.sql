-- Standardize evidence upload fields to point to pair tasks/subtasks
ALTER TABLE mp_evidence_uploads DROP CONSTRAINT IF EXISTS mp_evidence_master_task_id_fkey;
ALTER TABLE mp_evidence_uploads DROP CONSTRAINT IF EXISTS mp_evidence_uploads_pair_task_id_fkey;
ALTER TABLE mp_evidence_uploads DROP CONSTRAINT IF EXISTS mp_evidence_uploads_sub_task_id_fkey;

-- Rename columns for clarity (pointing to pair-specific items)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mp_evidence_uploads' AND column_name = 'master_task_id') THEN
    ALTER TABLE mp_evidence_uploads RENAME COLUMN master_task_id TO pair_task_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mp_evidence_uploads' AND column_name = 'sub_task_id') THEN
    ALTER TABLE mp_evidence_uploads RENAME COLUMN sub_task_id TO pair_subtask_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mp_evidence_uploads' AND column_name = 'task_id') THEN
    -- If there's already a task_id (maybe from a failed previous migration), merge it or rename it
    ALTER TABLE mp_evidence_uploads RENAME COLUMN task_id TO old_task_id;
  END IF;
END $$;

-- Ensure we have the correct columns and they are UUID
-- (Adding them if they somehow don't exist after renames)
ALTER TABLE mp_evidence_uploads ADD COLUMN IF NOT EXISTS pair_task_id UUID;
ALTER TABLE mp_evidence_uploads ADD COLUMN IF NOT EXISTS pair_subtask_id UUID;

-- Re-add foreign key constraints
ALTER TABLE mp_evidence_uploads 
ADD CONSTRAINT mp_evidence_uploads_pair_task_id_fkey 
FOREIGN KEY (pair_task_id) REFERENCES mp_pair_tasks(id) ON DELETE SET NULL;

ALTER TABLE mp_evidence_uploads 
ADD CONSTRAINT mp_evidence_uploads_pair_subtask_id_fkey 
FOREIGN KEY (pair_subtask_id) REFERENCES mp_pair_subtasks(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mp_evidence_uploads_pair_task_id ON mp_evidence_uploads(pair_task_id);
CREATE INDEX IF NOT EXISTS idx_mp_evidence_uploads_pair_subtask_id ON mp_evidence_uploads(pair_subtask_id);
