-- Migration 066: Fix RLS Insert Violations & Robustness
-- Fallback to join-based checks if denormalized organisation_id is missing/NULL.
-- This ensures the app doesn't break if the API hasn't been updated to pass these columns.

-- --- mp_meetings ---
DROP POLICY IF EXISTS "jwt_meeting_view" ON mp_meetings;
DROP POLICY IF EXISTS "jwt_meeting_all" ON mp_meetings;

CREATE POLICY "jwt_meeting_view" ON mp_meetings FOR SELECT TO authenticated 
  USING (
    public.is_system_owner() 
    OR organisation_id = public.active_org_id()
    -- Fallback for existing or missing data
    OR EXISTS (SELECT 1 FROM mp_pairs WHERE id = pair_id AND organisation_id = public.active_org_id())
  );

CREATE POLICY "jwt_meeting_all" ON mp_meetings FOR ALL TO authenticated 
  USING (
    public.is_system_owner() 
    OR organisation_id = public.active_org_id()
    -- Allow INSERT/UPDATE if the parent pair is in the active org
    OR EXISTS (SELECT 1 FROM mp_pairs WHERE id = pair_id AND organisation_id = public.active_org_id())
  );

-- --- mp_evidence_uploads ---
DROP POLICY IF EXISTS "jwt_evidence_view" ON mp_evidence_uploads;
DROP POLICY IF EXISTS "jwt_evidence_insert" ON mp_evidence_uploads;
DROP POLICY IF EXISTS "jwt_evidence_privileged_all" ON mp_evidence_uploads;

CREATE POLICY "jwt_evidence_view" ON mp_evidence_uploads FOR SELECT TO authenticated 
  USING (
    public.is_system_owner() 
    OR organisation_id = public.active_org_id()
    OR EXISTS (SELECT 1 FROM mp_pairs WHERE id = pair_id AND organisation_id = public.active_org_id())
  );

CREATE POLICY "jwt_evidence_insert" ON mp_evidence_uploads FOR INSERT TO authenticated 
  WITH CHECK (
    public.is_system_owner() 
    OR organisation_id = public.active_org_id()
    OR EXISTS (SELECT 1 FROM mp_pairs WHERE id = pair_id AND organisation_id = public.active_org_id())
  );

CREATE POLICY "jwt_evidence_privileged_all" ON mp_evidence_uploads FOR ALL TO authenticated 
  USING (
    public.is_system_owner() 
    OR (organisation_id = public.active_org_id() AND public.is_privileged())
    OR (public.is_privileged() AND EXISTS (SELECT 1 FROM mp_pairs WHERE id = pair_id AND organisation_id = public.active_org_id()))
  );

-- --- mp_pair_tasks ---
DROP POLICY IF EXISTS "jwt_pair_task_view" ON mp_pair_tasks;
DROP POLICY IF EXISTS "jwt_pair_task_update" ON mp_pair_tasks;
DROP POLICY IF EXISTS "jwt_pair_task_privileged_all" ON mp_pair_tasks;

CREATE POLICY "jwt_pair_task_view" ON mp_pair_tasks FOR SELECT TO authenticated 
  USING (
    public.is_system_owner() 
    OR organisation_id = public.active_org_id()
    OR EXISTS (SELECT 1 FROM mp_pairs WHERE id = pair_id AND organisation_id = public.active_org_id())
  );

CREATE POLICY "jwt_pair_task_update" ON mp_pair_tasks FOR UPDATE TO authenticated 
  USING (
    public.is_system_owner() 
    OR organisation_id = public.active_org_id()
    OR EXISTS (SELECT 1 FROM mp_pairs WHERE id = pair_id AND organisation_id = public.active_org_id())
  );

CREATE POLICY "jwt_pair_task_privileged_all" ON mp_pair_tasks FOR ALL TO authenticated 
  USING (
    public.is_system_owner() 
    OR (organisation_id = public.active_org_id() AND public.is_privileged())
    OR (public.is_privileged() AND EXISTS (SELECT 1 FROM mp_pairs WHERE id = pair_id AND organisation_id = public.active_org_id()))
  );
