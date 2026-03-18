-- Migration 069: Restrict Supervisor Scope to Assigned Programs
-- This migration ensures supervisors can only view and manage data (programs, pairs, tasks, meetings, evidence) 
-- that they are explicitly assigned to, while maintaining Org Admin "God-mode" for the entire hospital.
-- Profiles (Participants) remain Org-wide for supervisors to allow pairing across the whole organisation.

-- 1. Helper function to check if a user is assigned to a program
CREATE OR REPLACE FUNCTION public.is_program_supervisor(prog_id UUID)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.mp_supervisor_programs
    WHERE user_id = auth.uid()
    AND program_id = prog_id
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Update mp_programs policies
DROP POLICY IF EXISTS "jwt_program_view" ON public.mp_programs;
DROP POLICY IF EXISTS "jwt_program_privileged_manage" ON public.mp_programs;

-- 2.1. SELECT: System Owners all, Org Admins all in org, Supervisors only assigned
CREATE POLICY "jwt_program_view" ON public.mp_programs FOR SELECT TO authenticated
  USING (
    public.is_system_owner()
    OR (organisation_id = public.active_org_id() AND (
      public.active_role() = 'org-admin' 
      OR public.is_program_supervisor(id)
    ))
  );

-- 2.2. ALL: System Owners all, Org Admins all in org (Supervisors cannot manage/create programs, only Org Admins)
CREATE POLICY "jwt_program_org_admin_manage" ON public.mp_programs FOR ALL TO authenticated
  USING (
    public.is_system_owner()
    OR (organisation_id = public.active_org_id() AND public.active_role() = 'org-admin')
  );

-- 3. Update mp_pairs policies
DROP POLICY IF EXISTS "jwt_pair_view" ON public.mp_pairs;
DROP POLICY IF EXISTS "jwt_pair_privileged_manage" ON public.mp_pairs;

-- 3.1. SELECT: System Owners all, Org Admins all in org, Supervisors only assigned, Members their own
CREATE POLICY "jwt_pair_view" ON public.mp_pairs FOR SELECT TO authenticated
  USING (
    public.is_system_owner()
    OR (organisation_id = public.active_org_id() AND (
      public.active_role() = 'org-admin'
      OR public.is_program_supervisor(program_id)
      OR mentor_id = auth.uid()
      OR mentee_id = auth.uid()
    ))
  );

-- 3.2. ALL: System Owners all, Org Admins all in org, Supervisors only assigned programs
CREATE POLICY "jwt_pair_privileged_manage" ON public.mp_pairs FOR ALL TO authenticated
  USING (
    public.is_system_owner()
    OR (organisation_id = public.active_org_id() AND (
      public.active_role() = 'org-admin'
      OR public.is_program_supervisor(program_id)
    ))
  );

-- 4. Update mp_pair_tasks policies
DROP POLICY IF EXISTS "jwt_pair_task_view" ON public.mp_pair_tasks;
DROP POLICY IF EXISTS "jwt_pair_task_update" ON public.mp_pair_tasks;
DROP POLICY IF EXISTS "jwt_pair_task_privileged_all" ON public.mp_pair_tasks;

CREATE POLICY "jwt_pair_task_view" ON public.mp_pair_tasks FOR SELECT TO authenticated
  USING (
    public.is_system_owner()
    OR (organisation_id = public.active_org_id() AND (
      public.active_role() = 'org-admin'
      OR public.is_program_supervisor(program_id)
      OR EXISTS (
        SELECT 1 FROM mp_pairs WHERE id = pair_id AND (mentor_id = auth.uid() OR mentee_id = auth.uid())
      )
    ))
  );

CREATE POLICY "jwt_pair_task_privileged_all" ON public.mp_pair_tasks FOR ALL TO authenticated
  USING (
    public.is_system_owner()
    OR (organisation_id = public.active_org_id() AND (
      public.active_role() = 'org-admin'
      OR public.is_program_supervisor(program_id)
      OR EXISTS (
        SELECT 1 FROM mp_pairs WHERE id = pair_id AND (mentor_id = auth.uid() OR mentee_id = auth.uid())
      )
    ))
  );

-- 5. Update mp_meetings policies
DROP POLICY IF EXISTS "jwt_meeting_view" ON public.mp_meetings;
DROP POLICY IF EXISTS "jwt_meeting_all" ON public.mp_meetings;

CREATE POLICY "jwt_meeting_view" ON public.mp_meetings FOR SELECT TO authenticated
  USING (
    public.is_system_owner()
    OR (organisation_id = public.active_org_id() AND (
      public.active_role() = 'org-admin'
      OR public.is_program_supervisor(program_id)
      OR EXISTS (
        SELECT 1 FROM mp_pairs WHERE id = pair_id AND (mentor_id = auth.uid() OR mentee_id = auth.uid())
      )
    ))
  );

CREATE POLICY "jwt_meeting_all" ON public.mp_meetings FOR ALL TO authenticated
  USING (
    public.is_system_owner()
    OR (organisation_id = public.active_org_id() AND (
      public.active_role() = 'org-admin'
      OR public.is_program_supervisor(program_id)
      OR EXISTS (
        SELECT 1 FROM mp_pairs WHERE id = pair_id AND (mentor_id = auth.uid() OR mentee_id = auth.uid())
      )
    ))
  );

-- 6. Update mp_evidence_uploads policies
DROP POLICY IF EXISTS "jwt_evidence_view" ON public.mp_evidence_uploads;
DROP POLICY IF EXISTS "jwt_evidence_insert" ON public.mp_evidence_uploads;
DROP POLICY IF EXISTS "jwt_evidence_privileged_all" ON public.mp_evidence_uploads;
DROP POLICY IF EXISTS "jwt_evidence_all" ON public.mp_evidence_uploads;

CREATE POLICY "jwt_evidence_view" ON public.mp_evidence_uploads FOR SELECT TO authenticated
  USING (
    public.is_system_owner()
    OR (organisation_id = public.active_org_id() AND (
      public.active_role() = 'org-admin'
      OR public.is_program_supervisor(program_id)
      OR EXISTS (
        SELECT 1 FROM mp_pairs WHERE id = pair_id AND (mentor_id = auth.uid() OR mentee_id = auth.uid())
      )
    ))
  );

CREATE POLICY "jwt_evidence_insert" ON public.mp_evidence_uploads FOR INSERT TO authenticated
  WITH CHECK (
    public.is_system_owner()
    OR (organisation_id = public.active_org_id() AND (
      public.active_role() = 'org-admin'
      OR public.is_program_supervisor(program_id)
      OR EXISTS (
        SELECT 1 FROM mp_pairs WHERE id = pair_id AND (mentor_id = auth.uid() OR mentee_id = auth.uid())
      )
    ))
  );

CREATE POLICY "jwt_evidence_all" ON public.mp_evidence_uploads FOR ALL TO authenticated
  USING (
    public.is_system_owner()
    OR (organisation_id = public.active_org_id() AND (
      public.active_role() = 'org-admin'
      OR public.is_program_supervisor(program_id)
      OR submitted_by = auth.uid()
    ))
  );
