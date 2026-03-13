-- Migration 059: Fix Task List RLS to allow all authenticated organisation members to view
-- This replaces the overly restrictive supervisor-only view policy

DROP POLICY IF EXISTS "supervisor_task_lists_view" ON mp_task_lists_master;
DROP POLICY IF EXISTS "member_view_task_lists" ON mp_task_lists_master;

CREATE POLICY "member_view_task_lists" ON mp_task_lists_master FOR SELECT TO authenticated 
    USING (EXISTS (SELECT 1 FROM mp_memberships m WHERE m.user_id = auth.uid() AND m.organisation_id = mp_task_lists_master.organisation_id));
