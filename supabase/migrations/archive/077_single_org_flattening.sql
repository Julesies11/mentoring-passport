-- Migration 077: Single-Organisation Instance Flattening (Enum Fix)
-- Removes multi-tenant overhead and enforces 3-tier hierarchy (Admins -> Supervisors -> Participants)

-- ============================================================================
-- 1. DATA PRESERVATION: Sync Role from Memberships to Profiles
-- ============================================================================

-- Ensure role column exists on mp_profiles
ALTER TABLE public.mp_profiles ADD COLUMN IF NOT EXISTS role TEXT;

-- Temporarily drop the old constraint if it exists
ALTER TABLE public.mp_profiles DROP CONSTRAINT IF EXISTS mp_profiles_role_check;

-- Backfill: Update profiles with their role from the memberships table
-- We cast m.role to TEXT to avoid Enum type comparison errors
UPDATE public.mp_profiles p
SET role = m.member_role
FROM (
  SELECT user_id, role::TEXT as member_role,
         CASE 
           WHEN role::TEXT = 'org-admin' THEN 1
           WHEN role::TEXT = 'supervisor' THEN 2
           ELSE 3
         END as priority
  FROM public.mp_memberships
  WHERE status = 'active'
) m
WHERE p.id = m.user_id 
AND (p.role IS NULL OR m.priority < (CASE 
                                       WHEN p.role = 'administrator' THEN 0 -- Existing Sys Admins keep top priority
                                       WHEN p.role = 'org-admin' THEN 1 
                                       WHEN p.role = 'supervisor' THEN 2 
                                       ELSE 3 
                                     END));

-- Set a default for any orphans
UPDATE public.mp_profiles SET role = 'program-member' WHERE role IS NULL;

-- Re-apply the expanded role constraint
ALTER TABLE public.mp_profiles ADD CONSTRAINT mp_profiles_role_check 
  CHECK (role = ANY (ARRAY['administrator'::text, 'org-admin'::text, 'supervisor'::text, 'program-member'::text]));

-- ============================================================================
-- 2. DROP MULTI-TENANT JUNCTIONS & HELPERS
-- ============================================================================
DROP TABLE IF EXISTS public.mp_memberships CASCADE;
DROP FUNCTION IF EXISTS public.active_org_id() CASCADE;
DROP FUNCTION IF EXISTS public.active_role() CASCADE;
DROP FUNCTION IF EXISTS public.switch_active_org(uuid) CASCADE;

-- ============================================================================
-- 3. CREATE NEW INSTANCE HELPERS
-- ============================================================================

-- Both 'administrator' (Sys Admin) and 'org-admin' have god-mode in this instance
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM mp_profiles 
    WHERE id = auth.uid() AND role IN ('administrator', 'org-admin')
  );
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION public.is_supervisor(p_program_id uuid DEFAULT NULL) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM mp_profiles p
    LEFT JOIN mp_supervisor_programs sp ON p.id = sp.user_id
    WHERE p.id = auth.uid() 
    AND p.role = 'supervisor'
    AND (p_program_id IS NULL OR sp.program_id = p_program_id)
  );
$$ LANGUAGE SQL STABLE;

-- Unified privileged check for Instance
CREATE OR REPLACE FUNCTION public.is_privileged() RETURNS boolean AS $$
  SELECT public.is_admin() OR public.is_supervisor();
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- 4. REMOVE REDUNDANT ORGANISATION_ID COLUMNS
-- ============================================================================
ALTER TABLE mp_profiles DROP COLUMN IF EXISTS organisation_id;
ALTER TABLE mp_programs DROP COLUMN IF EXISTS organisation_id;
ALTER TABLE mp_pairs DROP COLUMN IF EXISTS organisation_id;
ALTER TABLE mp_task_lists_master DROP COLUMN IF EXISTS organisation_id;
ALTER TABLE mp_tasks_master DROP COLUMN IF EXISTS organisation_id;
ALTER TABLE mp_program_tasks DROP COLUMN IF EXISTS organisation_id;
ALTER TABLE mp_pair_tasks DROP COLUMN IF EXISTS organisation_id;
ALTER TABLE mp_meetings DROP COLUMN IF EXISTS organisation_id;
ALTER TABLE mp_evidence_uploads DROP COLUMN IF EXISTS organisation_id;
ALTER TABLE mp_notifications DROP COLUMN IF EXISTS organisation_id;

-- ============================================================================
-- 5. SIMPLIFIED RLS POLICIES (3-Tier Hierarchy)
-- ============================================================================

-- --- mp_organisations ---
DROP POLICY IF EXISTS "jwt_org_view" ON mp_organisations;
DROP POLICY IF EXISTS "jwt_org_create" ON mp_organisations;
DROP POLICY IF EXISTS "jwt_org_update" ON mp_organisations;
DROP POLICY IF EXISTS "jwt_org_delete" ON mp_organisations;
DROP POLICY IF EXISTS "instance_org_view" ON mp_organisations;
DROP POLICY IF EXISTS "instance_org_admin_manage" ON mp_organisations;

CREATE POLICY "instance_org_view" ON mp_organisations FOR SELECT TO authenticated USING (true);
CREATE POLICY "instance_org_admin_manage" ON mp_organisations FOR ALL TO authenticated 
  USING (public.is_admin());

-- --- mp_profiles ---
DROP POLICY IF EXISTS "jwt_profile_view" ON mp_profiles;
DROP POLICY IF EXISTS "jwt_profile_self_update" ON mp_profiles;
DROP POLICY IF EXISTS "jwt_profile_admin_manage" ON mp_profiles;
DROP POLICY IF EXISTS "instance_profile_view" ON mp_profiles;
DROP POLICY IF EXISTS "instance_profile_self_update" ON mp_profiles;
DROP POLICY IF EXISTS "instance_profile_admin_manage" ON mp_profiles;

CREATE POLICY "instance_profile_view" ON mp_profiles FOR SELECT TO authenticated 
  USING (id = auth.uid() OR public.is_privileged());

CREATE POLICY "instance_profile_self_update" ON mp_profiles FOR UPDATE TO authenticated 
  USING (id = auth.uid());

CREATE POLICY "instance_profile_admin_manage" ON mp_profiles FOR ALL TO authenticated 
  USING (public.is_admin());

-- --- mp_programs ---
DROP POLICY IF EXISTS "jwt_program_view" ON mp_programs;
DROP POLICY IF EXISTS "jwt_program_privileged_manage" ON mp_programs;
DROP POLICY IF EXISTS "instance_program_view" ON mp_programs;
DROP POLICY IF EXISTS "instance_program_admin_manage" ON mp_programs;

CREATE POLICY "instance_program_view" ON mp_programs FOR SELECT TO authenticated 
  USING (public.is_admin() OR public.is_supervisor(id));

CREATE POLICY "instance_program_admin_manage" ON mp_programs FOR ALL TO authenticated 
  USING (public.is_admin());

-- --- mp_pairs ---
DROP POLICY IF EXISTS "jwt_pair_view" ON mp_pairs;
DROP POLICY IF EXISTS "jwt_pair_privileged_manage" ON mp_pairs;
DROP POLICY IF EXISTS "instance_pair_view" ON mp_pairs;
DROP POLICY IF EXISTS "instance_pair_manage" ON mp_pairs;

CREATE POLICY "instance_pair_view" ON mp_pairs FOR SELECT TO authenticated 
  USING (
    public.is_admin() 
    OR public.is_supervisor(program_id)
    OR mentor_id = auth.uid() 
    OR mentee_id = auth.uid()
  );

CREATE POLICY "instance_pair_manage" ON mp_pairs FOR ALL TO authenticated 
  USING (public.is_admin() OR public.is_supervisor(program_id));

-- --- mp_pair_tasks ---
DROP POLICY IF EXISTS "jwt_pair_task_view" ON mp_pair_tasks;
DROP POLICY IF EXISTS "jwt_pair_task_update" ON mp_pair_tasks;
DROP POLICY IF EXISTS "jwt_pair_task_privileged_all" ON mp_pair_tasks;
DROP POLICY IF EXISTS "instance_pair_task_view" ON mp_pair_tasks;
DROP POLICY IF EXISTS "instance_pair_task_update" ON mp_pair_tasks;
DROP POLICY IF EXISTS "instance_pair_task_admin" ON mp_pair_tasks;

CREATE POLICY "instance_pair_task_view" ON mp_pair_tasks FOR SELECT TO authenticated 
  USING (
    public.is_admin() 
    OR public.is_supervisor(program_id)
    OR EXISTS (SELECT 1 FROM mp_pairs WHERE id = pair_id AND (mentor_id = auth.uid() OR mentee_id = auth.uid()))
  );

CREATE POLICY "instance_pair_task_update" ON mp_pair_tasks FOR UPDATE TO authenticated 
  USING (
    public.is_admin() 
    OR public.is_supervisor(program_id)
    OR EXISTS (SELECT 1 FROM mp_pairs WHERE id = pair_id AND (mentor_id = auth.uid() OR mentee_id = auth.uid()))
  );

CREATE POLICY "instance_pair_task_admin" ON mp_pair_tasks FOR ALL TO authenticated 
  USING (public.is_admin() OR public.is_supervisor(program_id));

-- --- mp_meetings ---
DROP POLICY IF EXISTS "jwt_meeting_view" ON mp_meetings;
DROP POLICY IF EXISTS "jwt_meeting_all" ON mp_meetings;
DROP POLICY IF EXISTS "instance_meeting_view" ON mp_meetings;
DROP POLICY IF EXISTS "instance_meeting_all" ON mp_meetings;

CREATE POLICY "instance_meeting_view" ON mp_meetings FOR SELECT TO authenticated 
  USING (
    public.is_admin() 
    OR public.is_supervisor(program_id)
    OR EXISTS (SELECT 1 FROM mp_pairs WHERE id = pair_id AND (mentor_id = auth.uid() OR mentee_id = auth.uid()))
  );

CREATE POLICY "instance_meeting_all" ON mp_meetings FOR ALL TO authenticated 
  USING (
    public.is_admin() 
    OR public.is_supervisor(program_id)
    OR EXISTS (SELECT 1 FROM mp_pairs WHERE id = pair_id AND (mentor_id = auth.uid() OR mentee_id = auth.uid()))
  );

-- --- mp_evidence_uploads ---
DROP POLICY IF EXISTS "jwt_evidence_view" ON mp_evidence_uploads;
DROP POLICY IF EXISTS "jwt_evidence_insert" ON mp_evidence_uploads;
DROP POLICY IF EXISTS "jwt_evidence_all" ON mp_evidence_uploads;
DROP POLICY IF EXISTS "instance_evidence_view" ON mp_evidence_uploads;
DROP POLICY IF EXISTS "instance_evidence_all" ON mp_evidence_uploads;

CREATE POLICY "instance_evidence_view" ON mp_evidence_uploads FOR SELECT TO authenticated 
  USING (
    public.is_admin() 
    OR public.is_supervisor(program_id)
    OR EXISTS (SELECT 1 FROM mp_pairs WHERE id = pair_id AND (mentor_id = auth.uid() OR mentee_id = auth.uid()))
  );

CREATE POLICY "instance_evidence_all" ON mp_evidence_uploads FOR ALL TO authenticated 
  USING (
    public.is_admin() 
    OR public.is_supervisor(program_id)
    OR submitted_by = auth.uid()
  );

-- --- mp_notifications ---
DROP POLICY IF EXISTS "jwt_notifications_view" ON mp_notifications;
DROP POLICY IF EXISTS "jwt_notifications_manage" ON mp_notifications;
DROP POLICY IF EXISTS "jwt_notifications_insert" ON mp_notifications;
DROP POLICY IF EXISTS "instance_notifications_self" ON mp_notifications;
DROP POLICY IF EXISTS "instance_notifications_system_insert" ON mp_notifications;

CREATE POLICY "instance_notifications_self" ON mp_notifications FOR ALL TO authenticated 
  USING (recipient_id = auth.uid());

CREATE POLICY "instance_notifications_system_insert" ON mp_notifications FOR INSERT TO authenticated 
  WITH CHECK (true);

-- --- mp_supervisor_programs ---
DROP POLICY IF EXISTS "jwt_supervisor_programs_all" ON mp_supervisor_programs;
DROP POLICY IF EXISTS "instance_sp_all" ON mp_supervisor_programs;
CREATE POLICY "instance_sp_all" ON mp_supervisor_programs FOR ALL TO authenticated 
  USING (public.is_admin() OR user_id = auth.uid());

-- --- mp_task_lists_master ---
DROP POLICY IF EXISTS "jwt_task_list_view" ON mp_task_lists_master;
DROP POLICY IF EXISTS "jwt_task_list_manage" ON mp_task_lists_master;
DROP POLICY IF EXISTS "instance_task_list_view" ON mp_task_lists_master;
DROP POLICY IF EXISTS "instance_task_list_admin" ON mp_task_lists_master;
CREATE POLICY "instance_task_list_view" ON mp_task_lists_master FOR SELECT TO authenticated USING (true);
CREATE POLICY "instance_task_list_admin" ON mp_task_lists_master FOR ALL TO authenticated USING (public.is_admin());

-- --- mp_tasks_master ---
DROP POLICY IF EXISTS "jwt_task_master_view" ON mp_tasks_master;
DROP POLICY IF EXISTS "jwt_task_master_manage" ON mp_tasks_master;
DROP POLICY IF EXISTS "instance_task_master_view" ON mp_tasks_master;
DROP POLICY IF EXISTS "instance_task_master_admin" ON mp_tasks_master;
CREATE POLICY "instance_task_master_view" ON mp_tasks_master FOR SELECT TO authenticated USING (true);
CREATE POLICY "instance_task_master_admin" ON mp_tasks_master FOR ALL TO authenticated USING (public.is_admin());

-- ============================================================================
-- 6. STORAGE SIMPLIFICATION
-- ============================================================================

-- mp-avatars
DROP POLICY IF EXISTS "instance_avatar_view" ON storage.objects;
DROP POLICY IF EXISTS "instance_avatar_self_manage" ON storage.objects;
DROP POLICY IF EXISTS "instance_avatar_admin_manage" ON storage.objects;

CREATE POLICY "instance_avatar_view" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'mp-avatars');
CREATE POLICY "instance_avatar_self_manage" ON storage.objects FOR ALL TO authenticated 
  USING (bucket_id = 'mp-avatars' AND (name LIKE auth.uid() || '/%'));
CREATE POLICY "instance_avatar_admin_manage" ON storage.objects FOR ALL TO authenticated 
  USING (bucket_id = 'mp-avatars' AND public.is_admin());

-- mp-logos
DROP POLICY IF EXISTS "instance_logo_view" ON storage.objects;
DROP POLICY IF EXISTS "instance_logo_admin_manage" ON storage.objects;

CREATE POLICY "instance_logo_view" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'mp-logos');
CREATE POLICY "instance_logo_admin_manage" ON storage.objects FOR ALL TO authenticated 
  USING (bucket_id = 'mp-logos' AND public.is_admin());
