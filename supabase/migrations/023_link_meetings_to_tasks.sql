-- Link meetings to specific pair tasks
ALTER TABLE mp_meetings ADD COLUMN IF NOT EXISTS pair_task_id UUID REFERENCES mp_pair_tasks(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_mp_meetings_pair_task_id ON mp_meetings(pair_task_id);

-- Update RLS for meetings to ensure access via pair_task_id is consistent
-- (Existing policies on mp_meetings should already cover this via pair_id, but good to keep in mind)
