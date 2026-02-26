-- Add missing foreign key constraints for mp_evidence_uploads table
-- This migration ensures all foreign key relationships are properly established

-- First, add missing columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'mp_evidence_uploads' 
    AND column_name = 'task_id'
  ) THEN
    ALTER TABLE mp_evidence_uploads 
    ADD COLUMN task_id UUID REFERENCES mp_pair_tasks(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'mp_evidence_uploads' 
    AND column_name = 'sub_task_id'
  ) THEN
    ALTER TABLE mp_evidence_uploads 
    ADD COLUMN sub_task_id UUID REFERENCES mp_pair_subtasks(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add constraint for task_id referencing mp_pair_tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'mp_evidence_uploads_pair_task_id_fkey' 
    AND table_name = 'mp_evidence_uploads'
  ) THEN
    ALTER TABLE mp_evidence_uploads 
    ADD CONSTRAINT mp_evidence_uploads_pair_task_id_fkey 
    FOREIGN KEY (task_id) REFERENCES mp_pair_tasks(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add constraint for sub_task_id referencing mp_pair_subtasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'mp_evidence_uploads_sub_task_id_fkey' 
    AND table_name = 'mp_evidence_uploads'
  ) THEN
    ALTER TABLE mp_evidence_uploads 
    ADD CONSTRAINT mp_evidence_uploads_sub_task_id_fkey 
    FOREIGN KEY (sub_task_id) REFERENCES mp_pair_subtasks(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add constraint for pair_id referencing mp_pairs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'mp_evidence_uploads_pair_id_fkey' 
    AND table_name = 'mp_evidence_uploads'
  ) THEN
    ALTER TABLE mp_evidence_uploads 
    ADD CONSTRAINT mp_evidence_uploads_pair_id_fkey 
    FOREIGN KEY (pair_id) REFERENCES mp_pairs(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add constraint for submitted_by referencing mp_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'mp_evidence_uploads_submitted_by_fkey' 
    AND table_name = 'mp_evidence_uploads'
  ) THEN
    ALTER TABLE mp_evidence_uploads 
    ADD CONSTRAINT mp_evidence_uploads_submitted_by_fkey 
    FOREIGN KEY (submitted_by) REFERENCES mp_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add constraint for meeting_id referencing mp_meetings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'mp_evidence_uploads_meeting_id_fkey' 
    AND table_name = 'mp_evidence_uploads'
  ) THEN
    ALTER TABLE mp_evidence_uploads 
    ADD CONSTRAINT mp_evidence_uploads_meeting_id_fkey 
    FOREIGN KEY (meeting_id) REFERENCES mp_meetings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add constraint for reviewed_by referencing mp_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'mp_evidence_uploads_reviewed_by_fkey' 
    AND table_name = 'mp_evidence_uploads'
  ) THEN
    ALTER TABLE mp_evidence_uploads 
    ADD CONSTRAINT mp_evidence_uploads_reviewed_by_fkey 
    FOREIGN KEY (reviewed_by) REFERENCES mp_profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add constraint for master_subtask_id referencing mp_subtasks_master
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'mp_evidence_uploads_master_subtask_id_fkey' 
    AND table_name = 'mp_evidence_uploads'
  ) THEN
    ALTER TABLE mp_evidence_uploads 
    ADD CONSTRAINT mp_evidence_uploads_master_subtask_id_fkey 
    FOREIGN KEY (master_subtask_id) REFERENCES mp_subtasks_master(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON CONSTRAINT mp_evidence_uploads_pair_task_id_fkey ON mp_evidence_uploads IS 'Evidence can be linked to a specific pair task';
COMMENT ON CONSTRAINT mp_evidence_uploads_sub_task_id_fkey ON mp_evidence_uploads IS 'Evidence can be linked to a specific pair subtask';
COMMENT ON CONSTRAINT mp_evidence_uploads_pair_id_fkey ON mp_evidence_uploads IS 'Evidence belongs to a specific mentoring pair';
COMMENT ON CONSTRAINT mp_evidence_uploads_submitted_by_fkey ON mp_evidence_uploads IS 'User who submitted the evidence';
COMMENT ON CONSTRAINT mp_evidence_uploads_meeting_id_fkey ON mp_evidence_uploads IS 'Optional meeting association';
COMMENT ON CONSTRAINT mp_evidence_uploads_reviewed_by_fkey ON mp_evidence_uploads IS 'User who reviewed the evidence';
COMMENT ON CONSTRAINT mp_evidence_uploads_master_subtask_id_fkey ON mp_evidence_uploads IS 'Evidence can be linked to a master subtask';
