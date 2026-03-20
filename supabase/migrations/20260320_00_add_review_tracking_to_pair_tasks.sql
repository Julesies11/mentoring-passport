-- Migration: Add submission and review tracking to mp_pair_tasks
-- Description: Adds columns to track who submitted a task and who last reviewed it (approved/rejected).

ALTER TABLE public.mp_pair_tasks 
ADD COLUMN IF NOT EXISTS submitted_by_id UUID REFERENCES public.mp_profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_reviewed_by_id UUID REFERENCES public.mp_profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_action TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_mp_pair_tasks_submitted_by_id ON public.mp_pair_tasks(submitted_by_id);
CREATE INDEX IF NOT EXISTS idx_mp_pair_tasks_last_reviewed_by_id ON public.mp_pair_tasks(last_reviewed_by_id);

-- Add comments for documentation
COMMENT ON COLUMN public.mp_pair_tasks.submitted_by_id IS 'The user who submitted the task for review.';
COMMENT ON COLUMN public.mp_pair_tasks.last_reviewed_by_id IS 'The supervisor who last reviewed (approved/rejected) the task.';
COMMENT ON COLUMN public.mp_pair_tasks.last_reviewed_at IS 'The timestamp of the last review action.';
COMMENT ON COLUMN public.mp_pair_tasks.last_action IS 'The action taken by the supervisor (approved or rejected).';
