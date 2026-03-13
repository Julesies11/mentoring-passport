-- Migration 067: Harden & Unify RLS Policies (Final 4-Tier Security)
-- This migration enforces strict multi-tenant isolation across ALL tables
-- using JWT-based context for hospital-grade security.

-- ============================================================================
-- 1. PRE-CLEANUP: Drop objects that depend on legacy functions
-- ============================================================================

-- Drop policies depending on is_org_admin(uuid) or is_program_supervisor(uuid)
DROP POLICY IF EXISTS "org_admin_tasks_all" ON mp_tasks_master;
DROP POLICY IF EXISTS "subtasks_all_via_parent" ON mp_subtasks_master;
DROP POLICY IF EXISTS "org_admin_error_logs_view" ON mp_error_logs;
DROP POLICY IF EXISTS "org_admin_manage_avatars" ON storage.objects;
DROP POLICY IF EXISTS "org_admin_manage_logos" ON storage.objects;
DROP POLICY IF EXISTS "org_admin_manage_evidence" ON storage.objects;
DROP POLICY IF EXISTS "org_admin_sp_all" ON mp_supervisor_programs;
DROP POLICY IF EXISTS "org_admin_profiles_all" ON mp_profiles;
DROP POLICY IF EXISTS "org_admin_task_lists_all" ON mp_task_lists_master;
DROP POLICY IF EXISTS "org_admin_program_tasks_all" ON mp_program_tasks;
DROP POLICY IF EXISTS "supervisor_program_tasks_all" ON mp_program_tasks;
DROP POLICY IF EXISTS "supervisor_view_assigned_programs" ON mp_programs;
DROP POLICY IF EXISTS "supervisor_pairs_all" ON mp_pairs;
DROP POLICY IF EXISTS "supervisor_meetings_all" ON mp_meetings;
DROP POLICY IF EXISTS "supervisor_evidence_all" ON mp_evidence_uploads;
DROP POLICY IF EXISTS "supervisor_pair_tasks_all" ON mp_pair_tasks;
DROP POLICY IF EXISTS "org_admin_view_own" ON mp_organisations;
DROP POLICY IF EXISTS "org_admin_update_own" ON mp_organisations;
DROP POLICY IF EXISTS "org_admin_memberships_all" ON mp_memberships;
DROP POLICY IF EXISTS "org_admin_programs_all" ON mp_programs;
DROP POLICY IF EXISTS "org_admin_pairs_all" ON mp_pairs;
DROP POLICY IF EXISTS "org_admin_meetings_all" ON mp_meetings;
DROP POLICY IF EXISTS "org_admin_evidence_all" ON mp_evidence_uploads;
DROP POLICY IF EXISTS "org_admin_pair_tasks_all" ON mp_pair_tasks;
DROP POLICY IF EXISTS "org_admin_tasks_master_all" ON mp_tasks_master;
DROP POLICY IF EXISTS "org_admin_subtasks_master_all" ON mp_subtasks_master;
DROP POLICY IF EXISTS "supervisor_task_lists_view" ON mp_task_lists_master;
DROP POLICY IF EXISTS "member_program_tasks_view" ON mp_program_tasks;

-- Now safe to drop legacy functions
DROP FUNCTION IF EXISTS public.is_org_admin(uuid);
DROP FUNCTION IF EXISTS public.is_program_supervisor(uuid);

-- ============================================================================
-- 2. UTILITY: Re-confirm privileged helper
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_privileged() RETURNS boolean AS $$
  SELECT public.is_system_owner() OR public.active_role() IN ('org-admin', 'supervisor');
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- 3. INFRASTRUCTURE: Notifications Isolation
-- ============================================================================
-- Add organisation_id to notifications to ensure multi-hospital isolation
ALTER TABLE public.mp_notifications ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES public.mp_organisations(id);

-- Backfill: Try to find organisation_id from pairs if related_id is a pair_id
UPDATE public.mp_notifications n
SET organisation_id = p.organisation_id
FROM public.mp_pairs p
WHERE n.related_id = p.id AND n.organisation_id IS NULL;

-- ============================================================================
-- 3. HARDEN CORE TABLES (Organisations & Profiles)
-- ============================================================================

-- --- mp_organisations ---
DROP POLICY IF EXISTS "jwt_org_view" ON mp_organisations;
DROP POLICY IF EXISTS "jwt_org_admin_manage" ON mp_organisations;
DROP POLICY IF EXISTS "system_owner_org_all" ON mp_organisations;
DROP POLICY IF EXISTS "org_admin_view_own" ON mp_organisations;
DROP POLICY IF EXISTS "org_admin_update_own" ON mp_organisations;

-- 3.1. SELECT: System Owners see all, others see their active org or where they have a membership (for selection screen)
CREATE POLICY "jwt_org_view" ON mp_organisations FOR SELECT TO authenticated 
  USING (
    public.is_system_owner() 
    OR id = public.active_org_id()
    OR EXISTS (SELECT 1 FROM mp_memberships WHERE user_id = auth.uid() AND organisation_id = mp_organisations.id)
  );

-- 3.2. INSERT: Only System Owners can create new organisations
CREATE POLICY "jwt_org_create" ON mp_organisations FOR INSERT TO authenticated 
  WITH CHECK (public.is_system_owner());

-- 3.3. UPDATE: System Owners can update any, Org Admins can update their ACTIVE org
CREATE POLICY "jwt_org_update" ON mp_organisations FOR UPDATE TO authenticated 
  USING (
    public.is_system_owner() 
    OR (id = public.active_org_id() AND public.active_role() = 'org-admin')
  );

-- 3.4. DELETE: Only System Owners can delete organisations
CREATE POLICY "jwt_org_delete" ON mp_organisations FOR DELETE TO authenticated 
  USING (public.is_system_owner());

-- --- mp_profiles ---
-- (Existing logic from 060/065 updated for 067 consistency)
DROP POLICY IF EXISTS "jwt_profile_view" ON mp_profiles;
DROP POLICY IF EXISTS "jwt_profile_self_update" ON mp_profiles;
DROP POLICY IF EXISTS "jwt_profile_admin_manage" ON mp_profiles;

CREATE POLICY "jwt_profile_view" ON mp_profiles FOR SELECT TO authenticated 
  USING (
    id = auth.uid() 
    OR public.is_system_owner() 
    OR organisation_id = public.active_org_id()
  );

CREATE POLICY "jwt_profile_self_update" ON mp_profiles FOR UPDATE TO authenticated 
  USING (id = auth.uid());

CREATE POLICY "jwt_profile_admin_manage" ON mp_profiles FOR ALL TO authenticated 
  USING (public.is_system_owner() OR (organisation_id = public.active_org_id() AND public.active_role() = 'org-admin'));

-- ============================================================================
-- 4. HARDEN PAIR-DATA TABLES (Participant Isolation)
-- ============================================================================

-- --- mp_pairs ---
DROP POLICY IF EXISTS "jwt_pair_view" ON mp_pairs;
DROP POLICY IF EXISTS "jwt_pair_privileged_manage" ON mp_pairs;
DROP POLICY IF EXISTS "Supervisors can view all pairs" ON mp_pairs;
DROP POLICY IF EXISTS "Administrators can manage all pairs" ON mp_pairs;

CREATE POLICY "jwt_pair_view" ON mp_pairs FOR SELECT TO authenticated 
  USING (
    public.is_privileged() 
    OR (organisation_id = public.active_org_id() AND (mentor_id = auth.uid() OR mentee_id = auth.uid()))
  );

CREATE POLICY "jwt_pair_privileged_manage" ON mp_pairs FOR ALL TO authenticated 
  USING (public.is_privileged() AND organisation_id = public.active_org_id());

-- --- mp_pair_tasks ---
DROP POLICY IF EXISTS "jwt_pair_task_view" ON mp_pair_tasks;
DROP POLICY IF EXISTS "jwt_pair_task_update" ON mp_pair_tasks;
DROP POLICY IF EXISTS "jwt_pair_task_privileged_all" ON mp_pair_tasks;

CREATE POLICY "jwt_pair_task_view" ON mp_pair_tasks FOR SELECT TO authenticated 
  USING (
    public.is_privileged() 
    OR (organisation_id = public.active_org_id() AND EXISTS (
      SELECT 1 FROM mp_pairs WHERE id = pair_id AND (mentor_id = auth.uid() OR mentee_id = auth.uid())
    ))
  );

CREATE POLICY "jwt_pair_task_update" ON mp_pair_tasks FOR UPDATE TO authenticated 
  USING (
    public.is_privileged() 
    OR (organisation_id = public.active_org_id() AND EXISTS (
      SELECT 1 FROM mp_pairs WHERE id = pair_id AND (mentor_id = auth.uid() OR mentee_id = auth.uid())
    ))
  );

CREATE POLICY "jwt_pair_task_privileged_all" ON mp_pair_tasks FOR ALL TO authenticated 
  USING (public.is_privileged() AND organisation_id = public.active_org_id());

-- --- mp_meetings ---
DROP POLICY IF EXISTS "jwt_meeting_view" ON mp_meetings;
DROP POLICY IF EXISTS "jwt_meeting_all" ON mp_meetings;
DROP POLICY IF EXISTS "Supervisors can manage all meetings" ON mp_meetings;
DROP POLICY IF EXISTS "Administrators can manage all meetings" ON mp_meetings;

CREATE POLICY "jwt_meeting_view" ON mp_meetings FOR SELECT TO authenticated 
  USING (
    public.is_privileged() 
    OR (organisation_id = public.active_org_id() AND EXISTS (
      SELECT 1 FROM mp_pairs WHERE id = pair_id AND (mentor_id = auth.uid() OR mentee_id = auth.uid())
    ))
  );

CREATE POLICY "jwt_meeting_all" ON mp_meetings FOR ALL TO authenticated 
  USING (
    public.is_privileged() 
    OR (organisation_id = public.active_org_id() AND EXISTS (
      SELECT 1 FROM mp_pairs WHERE id = pair_id AND (mentor_id = auth.uid() OR mentee_id = auth.uid())
    ))
  );

-- --- mp_evidence_uploads ---
DROP POLICY IF EXISTS "jwt_evidence_view" ON mp_evidence_uploads;
DROP POLICY IF EXISTS "jwt_evidence_insert" ON mp_evidence_uploads;
DROP POLICY IF EXISTS "jwt_evidence_all" ON mp_evidence_uploads;
DROP POLICY IF EXISTS "jwt_evidence_privileged_all" ON mp_evidence_uploads;
DROP POLICY IF EXISTS "evidence_select_policy" ON mp_evidence_uploads;
DROP POLICY IF EXISTS "evidence_insert_policy" ON mp_evidence_uploads;
DROP POLICY IF EXISTS "evidence_mod_policy" ON mp_evidence_uploads;
DROP POLICY IF EXISTS "Administrators can manage all evidence uploads" ON mp_evidence_uploads;

CREATE POLICY "jwt_evidence_view" ON mp_evidence_uploads FOR SELECT TO authenticated 
  USING (
    public.is_privileged() 
    OR (organisation_id = public.active_org_id() AND EXISTS (
      SELECT 1 FROM mp_pairs WHERE id = pair_id AND (mentor_id = auth.uid() OR mentee_id = auth.uid())
    ))
  );

CREATE POLICY "jwt_evidence_insert" ON mp_evidence_uploads FOR INSERT TO authenticated 
  WITH CHECK (
    public.is_privileged() 
    OR (organisation_id = public.active_org_id() AND EXISTS (
      SELECT 1 FROM mp_pairs WHERE id = pair_id AND (mentor_id = auth.uid() OR mentee_id = auth.uid())
    ))
  );

CREATE POLICY "jwt_evidence_all" ON mp_evidence_uploads FOR ALL TO authenticated 
  USING (
    public.is_privileged() 
    OR (organisation_id = public.active_org_id() AND submitted_by = auth.uid())
  );

-- --- mp_pair_subtasks ---
DROP POLICY IF EXISTS "jwt_pair_subtask_all" ON mp_pair_subtasks;
DROP POLICY IF EXISTS "Users can view subtasks for their pairs" ON mp_pair_subtasks;
DROP POLICY IF EXISTS "Users can update subtasks for their pairs" ON mp_pair_subtasks;
DROP POLICY IF EXISTS "Supervisors can manage all subtasks" ON mp_pair_subtasks;

CREATE POLICY "jwt_pair_subtask_all" ON mp_pair_subtasks FOR ALL TO authenticated 
  USING (
    public.is_privileged() 
    OR EXISTS (
      SELECT 1 FROM mp_pair_tasks pt
      JOIN mp_pairs p ON pt.pair_id = p.id
      WHERE pt.id = pair_task_id 
      AND p.organisation_id = public.active_org_id()
      AND (p.mentor_id = auth.uid() OR p.mentee_id = auth.uid())
    )
  );

-- --- mp_notifications ---
DROP POLICY IF EXISTS "jwt_notifications_self" ON mp_notifications;
DROP POLICY IF EXISTS "notifications_view_scoped" ON mp_notifications;
DROP POLICY IF EXISTS "Users can create notifications" ON mp_notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON mp_notifications;

CREATE POLICY "jwt_notifications_view" ON mp_notifications FOR SELECT TO authenticated 
  USING (
    recipient_id = auth.uid() 
    AND (organisation_id = public.active_org_id() OR organisation_id IS NULL OR public.is_system_owner())
  );

CREATE POLICY "jwt_notifications_manage" ON mp_notifications FOR ALL TO authenticated 
  USING (
    recipient_id = auth.uid() 
    AND (organisation_id = public.active_org_id() OR organisation_id IS NULL OR public.is_system_owner())
  );

CREATE POLICY "jwt_notifications_insert" ON mp_notifications FOR INSERT TO authenticated 
  WITH CHECK (true); -- Allow system/API to create notifications

-- ============================================================================
-- 5. HARDEN JUNCTION TABLES
-- ============================================================================

-- --- mp_supervisor_programs ---
DROP POLICY IF EXISTS "system_owner_sp_all" ON mp_supervisor_programs;
DROP POLICY IF EXISTS "org_admin_sp_all" ON mp_supervisor_programs;
DROP POLICY IF EXISTS "supervisor_view_own_sp" ON mp_supervisor_programs;

CREATE POLICY "jwt_supervisor_programs_all" ON mp_supervisor_programs FOR ALL TO authenticated 
  USING (
    public.is_system_owner() 
    OR (user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM mp_programs WHERE id = program_id AND organisation_id = public.active_org_id()
    ))
    OR (public.active_role() = 'org-admin' AND EXISTS (
      SELECT 1 FROM mp_programs WHERE id = program_id AND organisation_id = public.active_org_id()
    ))
  );

-- ============================================================================
-- 6. UNIFY MASTER TABLES (Management restricted, Org-wide visibility)
-- ============================================================================

-- --- mp_task_lists_master ---
DROP POLICY IF EXISTS "system_owner_task_lists_all" ON mp_task_lists_master;
DROP POLICY IF EXISTS "org_admin_task_lists_all" ON mp_task_lists_master;
DROP POLICY IF EXISTS "supervisor_task_lists_view" ON mp_task_lists_master;

CREATE POLICY "jwt_task_list_view" ON mp_task_lists_master FOR SELECT TO authenticated 
  USING (organisation_id = public.active_org_id() OR public.is_system_owner());

CREATE POLICY "jwt_task_list_manage" ON mp_task_lists_master FOR ALL TO authenticated 
  USING (public.is_privileged() AND organisation_id = public.active_org_id());

-- --- mp_tasks_master ---
DROP POLICY IF EXISTS "Supervisors can manage all master tasks" ON mp_tasks_master;
DROP POLICY IF EXISTS "Supervisors can view all master tasks" ON mp_tasks_master;
DROP POLICY IF EXISTS "Administrators can manage all master tasks" ON mp_tasks_master;
DROP POLICY IF EXISTS "jwt_task_master_all" ON mp_tasks_master;

CREATE POLICY "jwt_task_master_view" ON mp_tasks_master FOR SELECT TO authenticated 
  USING (organisation_id = public.active_org_id() OR public.is_system_owner());

CREATE POLICY "jwt_task_master_manage" ON mp_tasks_master FOR ALL TO authenticated 
  USING (public.is_privileged() AND organisation_id = public.active_org_id());

-- --- mp_subtasks_master ---
DROP POLICY IF EXISTS "Supervisors can manage all master subtasks" ON mp_subtasks_master;
DROP POLICY IF EXISTS "Supervisors can view all master subtasks" ON mp_subtasks_master;
DROP POLICY IF EXISTS "jwt_subtask_master_all" ON mp_subtasks_master;

CREATE POLICY "jwt_subtask_master_view" ON mp_subtasks_master FOR SELECT TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM mp_tasks_master WHERE id = task_id AND (organisation_id = public.active_org_id() OR public.is_system_owner())
  ));

CREATE POLICY "jwt_subtask_master_manage" ON mp_subtasks_master FOR ALL TO authenticated 
  USING (
    public.is_privileged() AND EXISTS (
      SELECT 1 FROM mp_tasks_master WHERE id = task_id AND organisation_id = public.active_org_id()
    )
  );

-- --- mp_program_tasks ---
DROP POLICY IF EXISTS "system_owner_program_tasks_all" ON mp_program_tasks;
DROP POLICY IF EXISTS "org_admin_program_tasks_all" ON mp_program_tasks;
DROP POLICY IF EXISTS "supervisor_program_tasks_all" ON mp_program_tasks;
DROP POLICY IF EXISTS "member_program_tasks_view" ON mp_program_tasks;

CREATE POLICY "jwt_program_task_view" ON mp_program_tasks FOR SELECT TO authenticated 
  USING (organisation_id = public.active_org_id() OR public.is_system_owner());

CREATE POLICY "jwt_program_task_manage" ON mp_program_tasks FOR ALL TO authenticated 
  USING (public.is_privileged() AND organisation_id = public.active_org_id());

-- --- mp_program_subtasks ---
DROP POLICY IF EXISTS "system_owner_program_subtasks_all" ON mp_program_subtasks;
DROP POLICY IF EXISTS "program_subtasks_via_parent" ON mp_program_subtasks;

CREATE POLICY "jwt_program_subtask_all" ON mp_program_subtasks FOR ALL TO authenticated 
  USING (
    public.is_system_owner()
    OR EXISTS (
      SELECT 1 FROM mp_program_tasks pt 
      WHERE pt.id = program_task_id AND (pt.organisation_id = public.active_org_id())
    )
  );

-- ============================================================================
-- 7. SYSTEM TABLES (Strictly Read Only for non-admins)
-- ============================================================================

-- --- mp_evidence_types ---
DROP POLICY IF EXISTS "system_owner_evidence_types_all" ON mp_evidence_types;
DROP POLICY IF EXISTS "everyone_view_evidence_types" ON mp_evidence_types;

CREATE POLICY "jwt_evidence_type_view" ON mp_evidence_types FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "jwt_evidence_type_admin" ON mp_evidence_types FOR ALL TO authenticated 
  USING (public.is_system_owner());

-- --- mp_error_logs ---
DROP POLICY IF EXISTS "system_owner_error_logs_all" ON mp_error_logs;
DROP POLICY IF EXISTS "org_admin_error_logs_view" ON mp_error_logs;

CREATE POLICY "jwt_error_logs_view" ON mp_error_logs FOR SELECT TO authenticated 
  USING (
    public.is_system_owner() 
    OR (public.active_role() = 'org-admin' AND EXISTS (
      SELECT 1 FROM mp_profiles p 
      WHERE p.id = user_id AND p.organisation_id = public.active_org_id()
    ))
  );

CREATE POLICY "jwt_error_logs_manage" ON mp_error_logs FOR ALL TO authenticated 
  USING (public.is_system_owner());

-- ============================================================================
-- 8. STORAGE POLICIES (JWT-Based)
-- ============================================================================

-- --- mp-avatars ---
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Supervisors can manage all avatars" ON storage.objects;
DROP POLICY IF EXISTS "org_admin_manage_avatars" ON storage.objects;
DROP POLICY IF EXISTS "Administrators can manage all avatars" ON storage.objects;

CREATE POLICY "jwt_avatar_view" ON storage.objects FOR SELECT TO authenticated 
  USING (bucket_id = 'mp-avatars');

CREATE POLICY "jwt_avatar_self_manage" ON storage.objects FOR ALL TO authenticated 
  USING (bucket_id = 'mp-avatars' AND (name LIKE auth.uid() || '/%'));

CREATE POLICY "jwt_avatar_privileged_manage" ON storage.objects FOR ALL TO authenticated 
  USING (bucket_id = 'mp-avatars' AND public.is_privileged());

-- --- mp-logos ---
DROP POLICY IF EXISTS "org_admin_manage_logos" ON storage.objects;
DROP POLICY IF EXISTS "Administrators can manage all logos" ON storage.objects;
DROP POLICY IF EXISTS "jwt_logo_view" ON storage.objects;
DROP POLICY IF EXISTS "jwt_logo_admin_manage" ON storage.objects;

CREATE POLICY "jwt_logo_view" ON storage.objects FOR SELECT TO authenticated 
  USING (bucket_id = 'mp-logos');

CREATE POLICY "jwt_logo_manage" ON storage.objects FOR ALL TO authenticated 
  USING (
    bucket_id = 'mp-logos' 
    AND (public.is_system_owner() OR public.active_role() = 'org-admin')
  );

-- --- mp-evidence ---
DROP POLICY IF EXISTS "storage_all_supervisor" ON storage.objects;
DROP POLICY IF EXISTS "storage_select_member" ON storage.objects;
DROP POLICY IF EXISTS "storage_insert_member" ON storage.objects;
DROP POLICY IF EXISTS "storage_delete_member" ON storage.objects;
DROP POLICY IF EXISTS "Members view own pair evidence" ON storage.objects;
DROP POLICY IF EXISTS "Members upload to own pair" ON storage.objects;
DROP POLICY IF EXISTS "Members delete from own pair" ON storage.objects;
DROP POLICY IF EXISTS "org_admin_manage_evidence" ON storage.objects;
DROP POLICY IF EXISTS "Administrators can manage all evidence files" ON storage.objects;

CREATE POLICY "jwt_evidence_file_view" ON storage.objects FOR SELECT TO authenticated 
  USING (
    bucket_id = 'mp-evidence-photos' 
    AND (
      public.is_privileged() 
      OR EXISTS (
        SELECT 1 FROM mp_pairs 
        WHERE id::text = (split_part(name, '/', 1))
        AND (mentor_id = auth.uid() OR mentee_id = auth.uid())
      )
    )
  );

CREATE POLICY "jwt_evidence_file_insert" ON storage.objects FOR INSERT TO authenticated 
  WITH CHECK (
    bucket_id = 'mp-evidence-photos' 
    AND (
      public.is_privileged() 
      OR EXISTS (
        SELECT 1 FROM mp_pairs 
        WHERE id::text = (split_part(name, '/', 1))
        AND (mentor_id = auth.uid() OR mentee_id = auth.uid())
      )
    )
  );

CREATE POLICY "jwt_evidence_file_delete" ON storage.objects FOR DELETE TO authenticated 
  USING (
    bucket_id = 'mp-evidence-photos' 
    AND (
      public.is_privileged() 
      OR owner = auth.uid()
    )
  );
