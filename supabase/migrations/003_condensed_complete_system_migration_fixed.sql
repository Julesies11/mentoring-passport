-- Complete system migration (condensed from migrations 003-014) - FIXED VERSION
-- This migration sets up the complete sub-task system with proper access controls

-- ============================================================================
-- EVIDENCE TYPES SETUP
-- ============================================================================

-- Add requires_submission field to mp_evidence_types table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mp_evidence_types' AND column_name = 'requires_submission') THEN
    ALTER TABLE mp_evidence_types 
    ADD COLUMN requires_submission BOOLEAN DEFAULT false NOT NULL;
    
    -- Add comment for documentation
    COMMENT ON COLUMN mp_evidence_types.requires_submission IS 'If true, tasks with this evidence type require mandatory evidence submission for review';
    
    -- Create index for better performance on queries filtering by this field
    CREATE INDEX IF NOT EXISTS idx_mp_evidence_types_requires_submission ON mp_evidence_types USING btree (requires_submission) TABLESPACE pg_default;
  END IF;
END $$;

-- Insert required evidence types if they don't exist
INSERT INTO mp_evidence_types (id, name, requires_submission, created_at, updated_at) VALUES
(gen_random_uuid(), 'Photo evidence', true, NOW(), NOW()),
(gen_random_uuid(), 'Screenshot of mandatory training required', true, NOW(), NOW()),
(gen_random_uuid(), 'Mentee and Mentor to keep a copy themselves', false, NOW(), NOW()),
(gen_random_uuid(), 'Mentee and Mentor to keep their own notes', false, NOW(), NOW()),
(gen_random_uuid(), 'Mentee and Mentor to keep their own notes / reflection', false, NOW(), NOW()),
(gen_random_uuid(), 'Not Applicable', false, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- MASTER TASKS TABLE (from 003, 005)
-- ============================================================================

-- Create the master tasks table
CREATE TABLE mp_tasks_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  evidence_type_id UUID NULL REFERENCES mp_evidence_types(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on the new table
ALTER TABLE mp_tasks_master ENABLE ROW LEVEL SECURITY;

-- Create policies for mp_tasks_master - supervisor only access
-- This table serves as a template for tasks and has no direct relationship to pairs
CREATE POLICY "Supervisors can manage all master tasks" ON mp_tasks_master
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM mp_profiles 
    WHERE id = auth.uid() 
    AND role = 'supervisor'
  )
);

CREATE POLICY "Supervisors can view all master tasks" ON mp_tasks_master
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM mp_profiles 
    WHERE id = auth.uid() 
    AND role = 'supervisor'
  )
);

-- Create indexes for better performance
CREATE INDEX idx_mp_tasks_master_evidence_type ON mp_tasks_master USING btree (evidence_type_id) TABLESPACE pg_default;
CREATE INDEX idx_mp_tasks_master_is_active ON mp_tasks_master(is_active);
CREATE INDEX idx_mp_tasks_master_sort_order ON mp_tasks_master(sort_order);

-- Add trigger for updated_at
CREATE TRIGGER mp_update_tasks_master_updated_at BEFORE
UPDATE ON mp_tasks_master FOR EACH ROW
EXECUTE FUNCTION mp_update_updated_at_column();

-- ============================================================================
-- PAIR TASKS UPDATES (from 004, 006)
-- ============================================================================

-- Add completed_by_user_id field to mp_pair_tasks table
ALTER TABLE mp_pair_tasks 
ADD COLUMN completed_by_user_id UUID REFERENCES mp_profiles(id) ON DELETE SET NULL;

-- Add index for better performance
CREATE INDEX idx_mp_pair_tasks_completed_by_user_id ON mp_pair_tasks(completed_by_user_id);

-- Update mp_pair_tasks table structure
-- Rename task_id to master_task_id and add snapshot fields
-- First, drop existing foreign key constraint
ALTER TABLE mp_pair_tasks DROP CONSTRAINT IF EXISTS mp_pair_tasks_task_id_fkey;

-- Rename task_id to master_task_id
ALTER TABLE mp_pair_tasks RENAME COLUMN task_id TO master_task_id;

-- Add new foreign key constraint to mp_tasks_master
ALTER TABLE mp_pair_tasks 
ADD CONSTRAINT mp_pair_tasks_master_task_id_fkey 
FOREIGN KEY (master_task_id) REFERENCES mp_tasks_master(id) ON DELETE CASCADE;

-- Add name column (snapshot copy from master task)
ALTER TABLE mp_pair_tasks ADD COLUMN name TEXT NOT NULL;

-- Add evidence_type_id column (mandatory)
ALTER TABLE mp_pair_tasks ADD COLUMN evidence_type_id UUID NOT NULL;

-- Add foreign key constraint for evidence_type_id
ALTER TABLE mp_pair_tasks 
ADD CONSTRAINT mp_pair_tasks_evidence_type_id_fkey 
FOREIGN KEY (evidence_type_id) REFERENCES mp_evidence_types(id) ON DELETE RESTRICT;

-- Add sort_order column
ALTER TABLE mp_pair_tasks ADD COLUMN sort_order INTEGER NOT NULL;

-- Update the unique constraint to use the new column name
ALTER TABLE mp_pair_tasks DROP CONSTRAINT IF EXISTS unique_pair_task;
ALTER TABLE mp_pair_tasks 
ADD CONSTRAINT unique_pair_task UNIQUE (pair_id, master_task_id);

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_mp_pair_tasks_master_task_id ON mp_pair_tasks USING btree (master_task_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_mp_pair_tasks_evidence_type_id ON mp_pair_tasks USING btree (evidence_type_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_mp_pair_tasks_sort_order ON mp_pair_tasks USING btree (sort_order) TABLESPACE pg_pair_tasks;
CREATE INDEX IF NOT EXISTS idx_mp_pair_tasks_completed_by_user_id ON mp_pair_tasks(completed_by_user_id) TABLESPACE pg_default;

-- ============================================================================
-- EVIDENCE TABLE UPDATES (from 007, 008, 012, 013)
-- ============================================================================

-- Update mp_evidence table structure
-- Rename task_id to master_task_id to match the new pair_tasks structure
-- Drop existing foreign key constraint
ALTER TABLE mp_evidence DROP CONSTRAINT IF EXISTS mp_evidence_task_id_fkey;

-- Rename task_id to master_task_id
ALTER TABLE mp_evidence RENAME COLUMN task_id TO master_task_id;

-- Add new foreign key constraint to mp_tasks_master
ALTER TABLE mp_evidence 
ADD CONSTRAINT mp_evidence_master_task_id_fkey 
FOREIGN KEY (master_task_id) REFERENCES mp_tasks_master(id) ON DELETE SET NULL;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_mp_evidence_master_task_id ON mp_evidence USING btree (master_task_id) TABLESPACE pg_default;

-- Update mp_evidence table to support subtasks
-- Add master_subtask_id field to link evidence to specific subtasks
ALTER TABLE mp_evidence 
ADD COLUMN master_subtask_id UUID REFERENCES mp_subtasks_master(id) ON DELETE SET NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_mp_evidence_master_subtask_id ON mp_evidence USING btree (master_subtask_id) TABLESPACE pg_default;

-- Add comment for documentation
COMMENT ON COLUMN mp_evidence.master_subtask_id IS 'Reference to the specific subtask this evidence belongs to (optional)';

-- Rename mp_evidence to mp_evidence_uploads and update foreign key relationships
-- First, drop the existing triggers and functions
DROP TRIGGER IF EXISTS mp_on_evidence_reviewed ON mp_evidence;
DROP TRIGGER IF EXISTS mp_on_evidence_uploaded ON mp_evidence;
DROP TRIGGER IF EXISTS mp_update_evidence_updated_at ON mp_evidence;

-- Drop existing foreign key constraints
ALTER TABLE mp_evidence DROP CONSTRAINT IF EXISTS mp_evidence_task_id_fkey;
ALTER TABLE mp_evidence DROP CONSTRAINT IF EXISTS mp_evidence_pair_id_fkey;
ALTER TABLE mp_evidence DROP CONSTRAINT IF EXISTS mp_evidence_submitted_by_fkey;
ALTER TABLE mp_evidence DROP CONSTRAINT IF EXISTS mp_evidence_meeting_id_fkey;
ALTER TABLE mp_evidence DROP CONSTRAINT IF EXISTS mp_evidence_reviewed_by_fkey;

-- Rename the table
ALTER TABLE mp_evidence RENAME TO mp_evidence_uploads;

-- Add the new foreign key constraints for the updated schema
ALTER TABLE mp_evidence_uploads 
ADD CONSTRAINT mp_evidence_uploads_pair_task_id_fkey 
FOREIGN KEY (task_id) REFERENCES mp_pair_tasks(id) ON DELETE SET NULL;

ALTER TABLE mp_evidence_uploads 
ADD CONSTRAINT mp_evidence_uploads_sub_task_id_fkey 
FOREIGN KEY (sub_task_id) REFERENCES mp_pair_subtasks(id) ON DELETE SET NULL;

ALTER TABLE mp_evidence_uploads 
ADD CONSTRAINT mp_evidence_uploads_pair_id_fkey 
FOREIGN KEY (pair_id) REFERENCES mp_pairs(id) ON DELETE CASCADE;

ALTER TABLE mp_evidence_uploads 
ADD CONSTRAINT mp_evidence_uploads_submitted_by_fkey 
FOREIGN KEY (submitted_by) REFERENCES mp_profiles(id) ON DELETE CASCADE;

ALTER TABLE mp_evidence_uploads 
ADD CONSTRAINT mp_evidence_uploads_meeting_id_fkey 
FOREIGN KEY (meeting_id) REFERENCES mp_meetings(id) ON delete set null;

ALTER TABLE mp_evidence_uploads 
ADD CONSTRAINT mp_evidence_uploads_reviewed_by_fkey 
FOREIGN KEY (reviewed_by) REFERENCES mp_profiles(id) ON DELETE SET NULL;

-- Recreate indexes for the renamed table
CREATE INDEX IF NOT EXISTS idx_mp_evidence_uploads_pair ON mp_evidence_uploads USING btree (pair_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_mp_evidence_uploads_status ON mp_evidence_uploads USING btree (status) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_mp_evidence_uploads_task_id ON mp_evidence_uploads USING btree (task_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_mp_evidence_uploads_sub_task_id ON mp_evidence_uploads USING btree (sub_task_id) TABLESPACE pg_default;

-- Recreate trigger for updated_at only
CREATE TRIGGER mp_update_evidence_uploads_updated_at BEFORE
UPDATE ON mp_evidence_uploads FOR EACH ROW
EXECUTE FUNCTION mp_update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE mp_evidence_uploads IS 'Stores evidence uploads for mentoring pairs, can be linked to either tasks or subtasks';
COMMENT ON COLUMN mp_evidence_uploads.task_id IS 'Reference to the pair task this evidence belongs to (nullable)';
COMMENT ON COLUMN mp_evidence_uploads.sub_task_id IS 'Reference to the pair subtask this evidence belongs to (nullable)';

-- ============================================================================
-- MASTER SUBTASKS TABLE (from 010)
-- ============================================================================

-- Create mp_subtasks_master table
CREATE TABLE mp_subtasks_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES mp_tasks_master(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  evidence_type_id UUID REFERENCES mp_evidence_types(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on the new table
ALTER TABLE mp_subtasks_master ENABLE ROW LEVEL SECURITY;

-- Create policies for mp_subtasks_master - supervisor only access
-- This table serves as a template for subtasks and has no direct relationship to pairs
-- Create policy for supervisors to manage master subtasks
CREATE POLICY "Supervisors can manage all master subtasks" ON mp_subtasks_master
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM mp_profiles 
    WHERE id = auth.uid() 
    AND role = 'supervisor'
  )
);

-- Create read-only policy for supervisors to view master subtasks
CREATE POLICY "Supervisors can view all master subtasks" ON mp_subtasks_master
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM mp_profiles 
    WHERE id = auth.uid() 
    AND role = 'supervisor'
  )
);

-- Create indexes for better performance
CREATE INDEX idx_mp_subtasks_master_task_id ON mp_subtasks_master USING btree (task_id) TABLESPACE pg_default;
CREATE INDEX idx_mp_subtasks_master_evidence_type_id ON mp_subtasks_master USING btree (evidence_type_id) TABLESPACE pg_default;
CREATE INDEX idx_mp_subtasks_master_sort_order ON mp_subtasks_master USING btree (sort_order) TABLESPACE pg_default;

-- Add updated_at trigger
CREATE TRIGGER mp_update_subtasks_master_updated_at BEFORE
UPDATE ON mp_subtasks_master FOR EACH ROW
EXECUTE FUNCTION mp_update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE mp_subtasks_master IS 'Stores sub-tasks for master tasks (supervisor access only), each with their own evidence type and requirements';
COMMENT ON COLUMN mp_subtasks_master.task_id IS 'Reference to the parent master task';
COMMENT ON COLUMN mp_subtasks_master.evidence_type_id IS 'Evidence type required for this sub-task (can be different from parent task)';
COMMENT ON COLUMN mp_subtasks_master.name IS 'Name of the sub-task (template for pair subtasks)';
COMMENT ON COLUMN mp_subtasks_master.sort_order IS 'Order in which sub-tasks should be displayed';

-- ============================================================================
-- PAIR SUBTASKS TABLE (from 011)
-- ============================================================================

-- Create mp_pair_subtasks table
CREATE TABLE mp_pair_subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_task_id UUID NOT NULL REFERENCES mp_pair_tasks(id) ON DELETE CASCADE,
  master_subtask_id UUID NOT NULL REFERENCES mp_subtasks_master(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  evidence_type_id UUID REFERENCES mp_evidence_types(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN DEFAULT false NOT NULL,
  completed_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on the new table
ALTER TABLE mp_pair_subtasks ENABLE ROW LEVEL SECURITY;

-- Create policies for mp_pair_subtasks
CREATE POLICY "Users can view subtasks for their pairs" ON mp_pair_subtasks
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM mp_pairs 
    WHERE (mp_pairs.mentor_id = auth.uid() OR mp_pairs.mentee_id = auth.uid())
    AND mp_pairs.id = (
      SELECT pair_id FROM mp_pair_tasks WHERE mp_pair_tasks.id = mp_pair_subtasks.pair_task_id
    )
  )
);

CREATE POLICY "Users can update subtasks for their pairs" ON mp_pair_subtasks
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM mp_pairs 
    WHERE (mp_pairs.mentor_id = auth.uid() OR mp_pairs.mentee_id = auth.uid())
    AND mp_pairs.id = (
      SELECT pair_id FROM mp_pair_tasks WHERE mp_pair_tasks.id = mp_pair_subtasks.pair_task_id
    )
  )
);

CREATE POLICY "Supervisors can manage all subtasks" ON mp_pair_subtasks
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM mp_profiles 
    WHERE id = auth.uid() 
    AND role = 'supervisor'
  )
);

-- Create indexes for better performance
CREATE INDEX idx_mp_pair_subtasks_pair_task_id ON mp_pair_subtasks USING btree (pair_task_id) TABLESPACE pg_default;
CREATE INDEX idx_mp_pair_subtasks_master_subtask_id ON mp_pair_subtasks USING btree (master_subtask_id) TABLESPACE pg_default;
CREATE INDEX idx_mp_pair_subtasks_evidence_type_id ON mp_pair_subtasks USING btree (evidence_type_id) TABLESPACE pg_default;
CREATE INDEX idx_mp_pair_subtasks_sort_order ON mp_pair_subtasks USING btree (sort_order) TABLESPACE pg_default;
CREATE INDEX idx_mp_pair_subtasks_is_completed ON mp_pair_subtasks USING btree (is_completed) TABLESPACE pg_default;
CREATE INDEX idx_mp_pair_subtasks_completed_by_id ON mp_pair_subtasks USING btree (completed_by_id) TABLESPACE pg_default;

-- Add updated_at trigger
CREATE TRIGGER mp_update_pair_subtasks_updated_at BEFORE
UPDATE ON mp_pair_subtasks FOR EACH ROW
EXECUTE FUNCTION mp_update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE mp_pair_subtasks IS 'Stores snapshot copies of sub-tasks for specific pairs with individual progress tracking';
COMMENT ON COLUMN mp_pair_subtasks.pair_task_id IS 'Reference to the parent pair task';
COMMENT ON COLUMN mp_pair_subtasks.master_subtask_id IS 'Reference to the original master subtask (for historical purposes)';
COMMENT ON COLUMN mp_pair_subtasks.name IS 'Snapshot copy of subtask name from master';
COMMENT ON COLUMN mp_pair_subtasks.evidence_type_id IS 'Snapshot copy of evidence type requirement';
COMMENT ON COLUMN mp_pair_subtasks.is_completed IS 'Whether this specific subtask has been completed';
COMMENT ON COLUMN mp_pair_subtasks.completed_by_id IS 'User who completed this subtask';

-- ============================================================================
-- DATA POPULATION
-- ============================================================================

-- Clean all existing data from tasks and subtasks tables
-- Temporarily drop foreign key constraints to handle existing data
ALTER TABLE mp_pair_tasks DROP CONSTRAINT IF EXISTS mp_pair_tasks_master_task_id_fkey;
ALTER TABLE mp_pair_subtasks DROP CONSTRAINT IF EXISTS mp_pair_subtasks_pair_task_id_fkey;
ALTER TABLE mp_pair_subtasks DROP CONSTRAINT IF EXISTS mp_pair_subtasks_master_subtask_id_fkey;
ALTER TABLE mp_subtasks_master DROP CONSTRAINT IF EXISTS mp_subtasks_master_task_id_fkey;

-- Delete all existing data
DELETE FROM mp_pair_subtasks;
DELETE FROM mp_subtasks_master;
DELETE FROM mp_pair_tasks;
DELETE FROM mp_tasks_master;

-- Re-create foreign key constraints after data cleanup
ALTER TABLE mp_pair_tasks 
ADD CONSTRAINT mp_pair_tasks_master_task_id_fkey 
FOREIGN KEY (master_task_id) REFERENCES mp_tasks_master(id) ON DELETE CASCADE;

ALTER TABLE mp_pair_subtasks 
ADD CONSTRAINT mp_pair_subtasks_pair_task_id_fkey 
FOREIGN KEY (pair_task_id) REFERENCES mp_pair_tasks(id) ON DELETE CASCADE;

ALTER TABLE mp_pair_subtasks 
ADD CONSTRAINT mp_pair_subtasks_master_subtask_id_fkey 
FOREIGN KEY (master_subtask_id) REFERENCES mp_subtasks_master(id) ON DELETE CASCADE;

ALTER TABLE mp_subtasks_master 
ADD CONSTRAINT mp_subtasks_master_task_id_fkey 
FOREIGN KEY (task_id) REFERENCES mp_tasks_master(id) ON DELETE CASCADE;

-- Insert specific master tasks and subtasks
INSERT INTO mp_tasks_master (id, name, evidence_type_id, sort_order, is_active, created_at, updated_at) VALUES
(gen_random_uuid(), 'Mentee to make contact with their Mentor - email and exchange numbers', NULL, 1, true, NOW(), NOW()),
(gen_random_uuid(), 'Mentoring meeting 1 - completed within 2 weeks of email contact if possible', (SELECT id FROM mp_evidence_types WHERE name = 'Photo evidence' LIMIT 1), 2, true, NOW(), NOW()),
(gen_random_uuid(), 'Mentoring meeting - involving food or drink', (SELECT id FROM mp_evidence_types WHERE name = 'Photo evidence' LIMIT 1), 3, true, NOW(), NOW()),
(gen_random_uuid(), 'Mentoring meeting - involving sport / outdoor activity', (SELECT id FROM mp_evidence_types WHERE name = 'Photo evidence' LIMIT 1), 4, true, NOW(), NOW()),
(gen_random_uuid(), 'Mentoring meeting - involving an arts / cultural / educational activity', (SELECT id FROM mp_evidence_types WHERE name = 'Photo evidence' LIMIT 1), 5, true, NOW(), NOW()),
(gen_random_uuid(), 'Challenge 1 - take a Mentoring team photo with our esteemed Head of Department', (SELECT id FROM mp_evidence_types WHERE name = 'Photo evidence' LIMIT 1), 6, true, NOW(), NOW()),
(gen_random_uuid(), 'Challenge 2 - proof of completion of Hospital Life Support (both mentee and mentor)', (SELECT id FROM mp_evidence_types WHERE name = 'Screenshot of mandatory training required' LIMIT 1), 7, true, NOW(), NOW()),
(gen_random_uuid(), 'Challenge 3 - share a favourite recipe / dish to cook', (SELECT id FROM mp_evidence_types WHERE name = 'Photo evidence' LIMIT 1), 8, true, NOW(), NOW()),
(gen_random_uuid(), 'Challenge 4 - discuss and share a favourite book / movie / TV series', (SELECT id FROM mp_evidence_types WHERE name = 'Photo evidence' LIMIT 1), 9, true, NOW(), NOW()),
(gen_random_uuid(), 'Reflection - skill sharing discussion - review notes from start of term', (SELECT id FROM mp_evidence_types WHERE name = 'Mentee and Mentor to keep their own notes / reflection' LIMIT 1), 10, true, NOW(), NOW()),
(gen_random_uuid(), 'Reflection - goal setting discussion - review notes from start of term', (SELECT id FROM mp_evidence_types WHERE name = 'Mentee and Mentor to keep their own notes / reflection' LIMIT 1), 11, true, NOW(), NOW()),
(gen_random_uuid(), 'Share any further mentoring meetings / catch-ups:', (SELECT id FROM mp_evidence_types WHERE name = 'Photo evidence' LIMIT 1), 12, true, NOW(), NOW());

-- Insert sub-tasks for task 2
INSERT INTO mp_subtasks_master (id, task_id, name, evidence_type_id, sort_order, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM mp_tasks_master WHERE name = 'Mentoring meeting 1 - completed within 2 weeks of email contact if possible' LIMIT 1), 'Mentoring agreement completed - utilise ACEM mentoring documents', (SELECT id FROM mp_evidence_types WHERE name = 'Mentee and Mentor to keep a copy themselves' LIMIT 1), 1, NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM mp_tasks_master WHERE name = 'Mentoring meeting 1 - completed within 2 weeks of email contact if possible' LIMIT 1), 'Skill sharing discussion - both Mentee and Mentor', (SELECT id FROM mp_evidence_types WHERE name = 'Mentee and Mentor to keep their own notes' LIMIT 1), 2, NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM mp_tasks_master WHERE name = 'Mentoring meeting 1 - completed within 2 weeks of email contact if possible' LIMIT 1), 'Goal setting discussion - both Mentee and Mentor', (SELECT id FROM mp_evidence_types WHERE name = 'Mentee and Mentor to keep their own notes' LIMIT 1), 3, NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM mp_tasks_master WHERE name = 'Mentoring meeting 1 - completed within 2 weeks of email contact if possible' LIMIT 1), 'Career mapping discussion and provision of guidance / support / advice', (SELECT id FROM mp_evidence_types WHERE name = 'Mentee and Mentor to keep their own notes' LIMIT 1), 4, NOW(), NOW());

-- Insert fresh pair tasks from master tasks (only if master tasks exist)
INSERT INTO mp_pair_tasks (
  id,
  pair_id,
  master_task_id,
  name,
  evidence_type_id,
  sort_order,
  status,
  completed_at,
  completed_by_user_id,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  p.id as pair_id,
  mt.id as master_task_id,
  mt.name,
  mt.evidence_type_id,
  mt.sort_order,
  'not_submitted' as status,
  NULL as completed_at,
  NULL as completed_by_user_id,
  NOW() as created_at,
  NOW() as updated_at
FROM mp_pairs p
CROSS JOIN mp_tasks_master mt
WHERE mt.is_active = true
AND p.status = 'active'
AND EXISTS (SELECT 1 FROM mp_tasks_master LIMIT 1);

-- Insert pair subtasks for all pairs that have task 2
INSERT INTO mp_pair_subtasks (
  id,
  pair_task_id,
  master_subtask_id,
  name,
  evidence_type_id,
  sort_order,
  is_completed,
  completed_by_id,
  completed_at,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  pt.id as pair_task_id,
  ms.id as master_subtask_id,
  ms.name,
  ms.evidence_type_id,
  ms.sort_order,
  false as is_completed,
  NULL as completed_by_id,
  NULL as completed_at,
  NOW() as created_at,
  NOW() as updated_at
FROM mp_pair_tasks pt
CROSS JOIN mp_subtasks_master ms
WHERE pt.master_task_id = (SELECT id FROM mp_tasks_master WHERE name = 'Mentoring meeting 1 - completed within 2 weeks of email contact if possible' LIMIT 1)
AND ms.task_id = (SELECT id FROM mp_tasks_master WHERE name = 'Mentoring meeting 1 - completed within 2 weeks of email contact if possible' LIMIT 1)
AND EXISTS (SELECT 1 FROM mp_pairs WHERE id = pt.pair_id AND status = 'active');

-- ============================================================================
-- NOTE: EVIDENCE SUBMISSION CONSTRAINT
-- ============================================================================
-- The evidence submission constraint has been moved to application level
-- in the updatePairTaskStatus function in src/lib/api/tasks.ts
-- This allows for better testing and debugging of the validation logic

-- ============================================================================
-- NOTE: EVIDENCE NOTIFICATION TRIGGERS
-- ============================================================================
-- The evidence notification triggers have been moved to application level
-- in the createEvidence and reviewEvidence functions in src/lib/api/evidence.ts
-- This allows for better testing, debugging, and maintainability

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All tables, indexes, policies, and triggers have been set up
-- The system now supports:
-- - Master tasks and subtasks (supervisor only)
-- - Pair tasks and subtasks (user accessible)
-- - Evidence submission with requirements
-- - Proper access controls and RLS policies
-- - Application-level validation and notifications
