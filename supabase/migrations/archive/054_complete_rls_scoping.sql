-- Migration 054: Completion of 4-Tier RLS Policies and Legacy Cleanup

-- ============================================================================
-- 1. LEGACY POLICY CLEANUP (Catch-all)
-- ============================================================================
-- Explicitly dropping any remaining old-style policies for tables covered here.

DROP POLICY IF EXISTS "Supervisors can manage all pair tasks" ON mp_pair_tasks;
DROP POLICY IF EXISTS "Users can view their pair tasks" ON mp_pair_tasks;
DROP POLICY IF EXISTS "Pair members can update pair tasks" ON mp_pair_tasks;
DROP POLICY IF EXISTS "Mentors can review tasks" ON mp_pair_tasks;
DROP POLICY IF EXISTS "Mentees can submit tasks" ON mp_pair_tasks;

DROP POLICY IF EXISTS "Supervisors can manage all subtasks" ON mp_pair_subtasks;
DROP POLICY IF EXISTS "Users can view subtasks for their pairs" ON mp_pair_subtasks;
DROP POLICY IF EXISTS "Users can update subtasks for their pairs" ON mp_pair_subtasks;

DROP POLICY IF EXISTS "Users can view own notifications" ON mp_notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON mp_notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON mp_notifications;
DROP POLICY IF EXISTS "System can create notifications" ON mp_notifications;

DROP POLICY IF EXISTS "Supervisors can manage evidence types" ON mp_evidence_types;
DROP POLICY IF EXISTS "Evidence types are viewable by all" ON mp_evidence_types;

DROP POLICY IF EXISTS "Supervisors can view all error logs" ON mp_error_logs;

-- ============================================================================
-- 2. APPLY REMAINING 4-TIER POLICIES
-- ============================================================================

-- --- mp_pair_tasks ---
ALTER TABLE mp_pair_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_owner_pair_tasks_all" ON mp_pair_tasks FOR ALL TO authenticated USING (public.is_system_owner());
CREATE POLICY "org_admin_pair_tasks_all" ON mp_pair_tasks FOR ALL TO authenticated USING (public.is_org_admin(organisation_id));
CREATE POLICY "supervisor_pair_tasks_all" ON mp_pair_tasks FOR ALL TO authenticated USING (public.is_program_supervisor(program_id));
CREATE POLICY "member_pair_tasks_view" ON mp_pair_tasks FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM mp_pairs p WHERE p.id = pair_id AND (p.mentor_id = auth.uid() OR p.mentee_id = auth.uid())));
CREATE POLICY "member_pair_tasks_update" ON mp_pair_tasks FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM mp_pairs p WHERE p.id = pair_id AND (p.mentor_id = auth.uid() OR p.mentee_id = auth.uid())));

-- --- mp_pair_subtasks ---
ALTER TABLE mp_pair_subtasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_owner_pair_subtasks_all" ON mp_pair_subtasks FOR ALL TO authenticated USING (public.is_system_owner());
CREATE POLICY "pair_subtasks_via_parent" ON mp_pair_subtasks FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM mp_pair_tasks pt WHERE pt.id = pair_task_id)); -- Inherits access from parent task RLS

-- --- mp_evidence_types ---
ALTER TABLE mp_evidence_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_owner_evidence_types_all" ON mp_evidence_types FOR ALL TO authenticated USING (public.is_system_owner());
CREATE POLICY "everyone_view_evidence_types" ON mp_evidence_types FOR SELECT TO authenticated USING (true);

-- --- mp_notifications ---
ALTER TABLE mp_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_owner_notifications_all" ON mp_notifications FOR ALL TO authenticated USING (public.is_system_owner());
CREATE POLICY "users_manage_own_notifications" ON mp_notifications FOR ALL TO authenticated 
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());
CREATE POLICY "allow_system_creation" ON mp_notifications FOR INSERT TO authenticated WITH CHECK (true);

-- --- mp_error_logs ---
ALTER TABLE mp_error_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_owner_error_logs_all" ON mp_error_logs FOR ALL TO authenticated USING (public.is_system_owner());
CREATE POLICY "org_admin_error_logs_view" ON mp_error_logs FOR SELECT TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM mp_profiles p 
    WHERE p.id = user_id AND public.is_org_admin(p.organisation_id)
  ));

-- --- mp_meeting_subtasks (Maintenance for deprecated table) ---
ALTER TABLE mp_meeting_subtasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_owner_meeting_subtasks_all" ON mp_meeting_subtasks FOR ALL TO authenticated USING (public.is_system_owner());
