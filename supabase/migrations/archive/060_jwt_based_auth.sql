-- 1. Create helper functions to extract context from JWT (Moved to PUBLIC schema)
-- These are used in RLS policies for O(1) performance
CREATE OR REPLACE FUNCTION public.active_org_id() RETURNS uuid AS $$
  SELECT (NULLIF(current_setting('request.jwt.claims', true)::json->'user_metadata'->>'active_org_id', ''))::uuid;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION public.active_role() RETURNS text AS $$
  SELECT (current_setting('request.jwt.claims', true)::json->'user_metadata'->>'active_role')::text;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION public.is_system_owner() RETURNS boolean AS $$
  SELECT (
    COALESCE((current_setting('request.jwt.claims', true)::json->'user_metadata'->>'is_system_owner')::boolean, false)
    OR 
    (current_setting('request.jwt.claims', true)::json->'user_metadata'->>'role' = 'administrator')
  );
$$ LANGUAGE SQL STABLE;

-- helper macro for "is_privileged_user" (admin or supervisor in active org)
CREATE OR REPLACE FUNCTION public.is_privileged() RETURNS boolean AS $$
  SELECT public.is_system_owner() OR public.active_role() IN ('org-admin', 'supervisor');
$$ LANGUAGE SQL STABLE;

-- 2. Create the RPC function to switch active organisation safely
CREATE OR REPLACE FUNCTION public.switch_active_org(new_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
  v_membership_role text;
  v_is_admin boolean;
  v_org_name text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Check if user is a global administrator
  -- We check the auth.users metadata for the definitive system role
  SELECT (raw_user_meta_data->>'role' = 'administrator') INTO v_is_admin
  FROM auth.users
  WHERE id = v_user_id;

  -- 2. Verify membership or admin status
  IF v_is_admin THEN
    v_membership_role := 'org-admin'; -- Admins masquerade as org-admins
  ELSE
    SELECT role INTO v_membership_role
    FROM mp_memberships
    WHERE user_id = v_user_id 
    AND organisation_id = new_org_id
    AND status = 'active';

    IF v_membership_role IS NULL THEN
      RAISE EXCEPTION 'User does not have an active membership in this organisation';
    END IF;
  END IF;

  -- 3. Get org name for logging/meta (optional)
  SELECT name INTO v_org_name FROM mp_organisations WHERE id = new_org_id;

  -- 4. Update the user's raw_user_meta_data
  -- This will be injected into the NEXT JWT issued after refreshSession()
  UPDATE auth.users
  SET raw_user_meta_data = 
    COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'active_org_id', new_org_id,
      'active_role', v_membership_role,
      'active_org_name', v_org_name,
      'is_system_owner', v_is_admin,
      -- Also sync the legacy fields for backward compatibility during migration
      'selected_organisation_id', new_org_id,
      'role', v_membership_role
    )
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'active_org_id', new_org_id,
    'active_role', v_membership_role
  );
END;
$$;

-- 3. Grant access to the function
GRANT EXECUTE ON FUNCTION public.switch_active_org(uuid) TO authenticated;

-- ============================================================================
-- 4. REWRITE RLS POLICIES USING JWT CONTEXT
-- ============================================================================

-- A. DROP ALL OLD POLICIES TO START FRESH
-- mp_organisations
DROP POLICY IF EXISTS "system_owner_org_all" ON mp_organisations;
DROP POLICY IF EXISTS "org_admin_view_own" ON mp_organisations;
DROP POLICY IF EXISTS "org_admin_update_own" ON mp_organisations;
DROP POLICY IF EXISTS "jwt_org_view" ON mp_organisations;
DROP POLICY IF EXISTS "jwt_org_admin_manage" ON mp_organisations;

-- mp_memberships
DROP POLICY IF EXISTS "system_owner_memberships_all" ON mp_memberships;
DROP POLICY IF EXISTS "org_admin_memberships_all" ON mp_memberships;
DROP POLICY IF EXISTS "user_view_own_memberships" ON mp_memberships;
DROP POLICY IF EXISTS "jwt_membership_self_view" ON mp_memberships;
DROP POLICY IF EXISTS "jwt_membership_privileged_manage" ON mp_memberships;

-- mp_profiles
DROP POLICY IF EXISTS "system_owner_profiles_all" ON mp_profiles;
DROP POLICY IF EXISTS "org_admin_profiles_all" ON mp_profiles;
DROP POLICY IF EXISTS "user_view_profiles_in_org" ON mp_profiles;
DROP POLICY IF EXISTS "user_update_own_profile" ON mp_profiles;
DROP POLICY IF EXISTS "jwt_profile_view" ON mp_profiles;
DROP POLICY IF EXISTS "jwt_profile_self_update" ON mp_profiles;
DROP POLICY IF EXISTS "jwt_profile_admin_manage" ON mp_profiles;

-- mp_programs
DROP POLICY IF EXISTS "system_owner_programs_all" ON mp_programs;
DROP POLICY IF EXISTS "org_admin_programs_all" ON mp_programs;
DROP POLICY IF EXISTS "supervisor_view_assigned_programs" ON mp_programs;
DROP POLICY IF EXISTS "member_view_org_programs" ON mp_programs;
DROP POLICY IF EXISTS "jwt_program_view" ON mp_programs;
DROP POLICY IF EXISTS "jwt_program_privileged_manage" ON mp_programs;

-- mp_pairs
DROP POLICY IF EXISTS "system_owner_pairs_all" ON mp_pairs;
DROP POLICY IF EXISTS "org_admin_pairs_all" ON mp_pairs;
DROP POLICY IF EXISTS "supervisor_pairs_all" ON mp_pairs;
DROP POLICY IF EXISTS "member_view_own_pairs" ON mp_pairs;
DROP POLICY IF EXISTS "jwt_pair_view" ON mp_pairs;
DROP POLICY IF EXISTS "jwt_pair_privileged_manage" ON mp_pairs;

-- mp_pair_tasks
DROP POLICY IF EXISTS "system_owner_pair_tasks_all" ON mp_pair_tasks;
DROP POLICY IF EXISTS "org_admin_pair_tasks_all" ON mp_pair_tasks;
DROP POLICY IF EXISTS "supervisor_pair_tasks_all" ON mp_pair_tasks;
DROP POLICY IF EXISTS "member_pair_tasks_view" ON mp_pair_tasks;
DROP POLICY IF EXISTS "member_pair_tasks_update" ON mp_pair_tasks;
DROP POLICY IF EXISTS "jwt_pair_task_view" ON mp_pair_tasks;
DROP POLICY IF EXISTS "jwt_pair_task_update" ON mp_pair_tasks;
DROP POLICY IF EXISTS "jwt_pair_task_privileged_all" ON mp_pair_tasks;

-- mp_meetings
DROP POLICY IF EXISTS "system_owner_meetings_all" ON mp_meetings;
DROP POLICY IF EXISTS "org_admin_meetings_all" ON mp_meetings;
DROP POLICY IF EXISTS "supervisor_meetings_all" ON mp_meetings;
DROP POLICY IF EXISTS "member_meetings_all" ON mp_meetings;
DROP POLICY IF EXISTS "jwt_meeting_view" ON mp_meetings;
DROP POLICY IF EXISTS "jwt_meeting_all" ON mp_meetings;

-- mp_evidence_uploads
DROP POLICY IF EXISTS "system_owner_evidence_all" ON mp_evidence_uploads;
DROP POLICY IF EXISTS "org_admin_evidence_all" ON mp_evidence_uploads;
DROP POLICY IF EXISTS "supervisor_evidence_all" ON mp_evidence_uploads;
DROP POLICY IF EXISTS "member_evidence_view" ON mp_evidence_uploads;
DROP POLICY IF EXISTS "member_evidence_insert" ON mp_evidence_uploads;
DROP POLICY IF EXISTS "jwt_evidence_view" ON mp_evidence_uploads;
DROP POLICY IF EXISTS "jwt_evidence_insert" ON mp_evidence_uploads;
DROP POLICY IF EXISTS "jwt_evidence_privileged_all" ON mp_evidence_uploads;

-- ============================================================================
-- B. APPLY NEW JWT-BASED POLICIES
-- ============================================================================

-- --- mp_organisations ---
CREATE POLICY "jwt_org_view" ON mp_organisations FOR SELECT TO authenticated 
  USING (public.is_system_owner() OR id = public.active_org_id());
CREATE POLICY "jwt_org_admin_manage" ON mp_organisations FOR ALL TO authenticated 
  USING (public.is_system_owner() OR (id = public.active_org_id() AND public.active_role() = 'org-admin'));

-- --- mp_memberships ---
CREATE POLICY "jwt_membership_self_view" ON mp_memberships FOR SELECT TO authenticated 
  USING (user_id = auth.uid());
CREATE POLICY "jwt_membership_privileged_manage" ON mp_memberships FOR ALL TO authenticated 
  USING (public.is_system_owner() OR (organisation_id = public.active_org_id() AND public.active_role() = 'org-admin'));

-- --- mp_profiles ---
CREATE POLICY "jwt_profile_view" ON mp_profiles FOR SELECT TO authenticated 
  USING (public.is_system_owner() OR organisation_id = public.active_org_id());
CREATE POLICY "jwt_profile_self_update" ON mp_profiles FOR UPDATE TO authenticated 
  USING (id = auth.uid());
CREATE POLICY "jwt_profile_admin_manage" ON mp_profiles FOR ALL TO authenticated 
  USING (public.is_system_owner() OR (organisation_id = public.active_org_id() AND public.active_role() = 'org-admin'));

-- --- mp_programs ---
CREATE POLICY "jwt_program_view" ON mp_programs FOR SELECT TO authenticated 
  USING (public.is_system_owner() OR organisation_id = public.active_org_id());
CREATE POLICY "jwt_program_privileged_manage" ON mp_programs FOR ALL TO authenticated 
  USING (public.is_system_owner() OR (organisation_id = public.active_org_id() AND public.active_role() = 'org-admin'));

-- --- mp_pairs ---
CREATE POLICY "jwt_pair_view" ON mp_pairs FOR SELECT TO authenticated 
  USING (public.is_system_owner() OR organisation_id = public.active_org_id());
CREATE POLICY "jwt_pair_privileged_manage" ON mp_pairs FOR ALL TO authenticated 
  USING (public.is_system_owner() OR (organisation_id = public.active_org_id() AND public.is_privileged()));

-- --- mp_pair_tasks ---
CREATE POLICY "jwt_pair_task_view" ON mp_pair_tasks FOR SELECT TO authenticated 
  USING (public.is_system_owner() OR organisation_id = public.active_org_id());
CREATE POLICY "jwt_pair_task_update" ON mp_pair_tasks FOR UPDATE TO authenticated 
  USING (public.is_system_owner() OR organisation_id = public.active_org_id());
CREATE POLICY "jwt_pair_task_privileged_all" ON mp_pair_tasks FOR ALL TO authenticated 
  USING (public.is_system_owner() OR (organisation_id = public.active_org_id() AND public.is_privileged()));

-- --- mp_pair_subtasks ---
DROP POLICY IF EXISTS "jwt_pair_subtask_all" ON mp_pair_subtasks;
CREATE POLICY "jwt_pair_subtask_all" ON mp_pair_subtasks FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM mp_pair_tasks WHERE id = pair_task_id AND organisation_id = public.active_org_id()));

-- --- mp_meetings ---
CREATE POLICY "jwt_meeting_view" ON mp_meetings FOR SELECT TO authenticated 
  USING (public.is_system_owner() OR organisation_id = public.active_org_id());
CREATE POLICY "jwt_meeting_all" ON mp_meetings FOR ALL TO authenticated 
  USING (public.is_system_owner() OR (organisation_id = public.active_org_id()));

-- --- mp_evidence_uploads ---
CREATE POLICY "jwt_evidence_view" ON mp_evidence_uploads FOR SELECT TO authenticated 
  USING (public.is_system_owner() OR organisation_id = public.active_org_id());
CREATE POLICY "jwt_evidence_insert" ON mp_evidence_uploads FOR INSERT TO authenticated 
  WITH CHECK (public.is_system_owner() OR organisation_id = public.active_org_id());
CREATE POLICY "jwt_evidence_privileged_all" ON mp_evidence_uploads FOR ALL TO authenticated 
  USING (public.is_system_owner() OR (organisation_id = public.active_org_id() AND public.is_privileged()));

-- --- mp_notifications ---
DROP POLICY IF EXISTS "jwt_notifications_self" ON mp_notifications;
CREATE POLICY "jwt_notifications_self" ON mp_notifications FOR ALL TO authenticated 
  USING (recipient_id = auth.uid());
