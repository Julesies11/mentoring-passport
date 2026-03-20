-- Migration: Fix error logs RLS and add task metadata columns
-- Description: Allows all authenticated users to insert error logs and ensures all submission/review metadata columns exist.

-- 1. FIX ERROR LOGS RLS
-- Drop existing restricted policies if they exist
DROP POLICY IF EXISTS "jwt_error_logs_manage" ON public.mp_error_logs;
DROP POLICY IF EXISTS "jwt_error_logs_all_sys_owner" ON public.mp_error_logs;
DROP POLICY IF EXISTS "jwt_error_logs_all_sys_admin" ON public.mp_error_logs;
DROP POLICY IF EXISTS "jwt_error_logs_insert_all" ON public.mp_error_logs;
DROP POLICY IF EXISTS "jwt_error_logs_view" ON public.mp_error_logs;

-- Re-create the manage policy for ALL actions but restricted to sys admin
CREATE POLICY "jwt_error_logs_all_sys_admin" ON public.mp_error_logs 
FOR ALL TO authenticated 
USING (public.is_sys_admin());

-- Add a specific INSERT policy for all authenticated users
-- This allows any logged-in user to report an error, even if they can't see the logs afterwards.
CREATE POLICY "jwt_error_logs_insert_all" ON public.mp_error_logs
FOR INSERT TO authenticated
WITH CHECK (true);

-- Ensure Org Admins and Sys Admins can still view logs
CREATE POLICY "jwt_error_logs_view" ON public.mp_error_logs 
FOR SELECT TO authenticated 
USING (
  public.is_sys_admin() 
  OR public.is_org_admin()
);

COMMENT ON POLICY "jwt_error_logs_insert_all" ON public.mp_error_logs IS 'Allows any authenticated user to insert error logs for diagnostic purposes.';

-- 2. ADD TASK METADATA COLUMNS
ALTER TABLE public.mp_pair_tasks 
ADD COLUMN IF NOT EXISTS last_action TEXT,
ADD COLUMN IF NOT EXISTS submitted_by_id UUID REFERENCES public.mp_profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_reviewed_by_id UUID REFERENCES public.mp_profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN public.mp_pair_tasks.last_action IS 'The action taken by the supervisor (approved or rejected).';
COMMENT ON COLUMN public.mp_pair_tasks.submitted_by_id IS 'The user who submitted the task for review.';
COMMENT ON COLUMN public.mp_pair_tasks.last_reviewed_by_id IS 'The supervisor who last reviewed (approved/rejected) the task.';
COMMENT ON COLUMN public.mp_pair_tasks.last_reviewed_at IS 'The timestamp of the last review action.';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_mp_pair_tasks_submitted_by_id ON public.mp_pair_tasks(submitted_by_id);
CREATE INDEX IF NOT EXISTS idx_mp_pair_tasks_last_reviewed_by_id ON public.mp_pair_tasks(last_reviewed_by_id);
