-- Add submitted_at column to mp_pair_tasks to track when a task was sent for review
ALTER TABLE mp_pair_tasks ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;

-- Add a comment for clarity
COMMENT ON COLUMN mp_pair_tasks.submitted_at IS 'The timestamp when the task was first moved to awaiting_review status.';
