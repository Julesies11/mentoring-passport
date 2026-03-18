-- Migration 053: Comprehensive 4-Tier RLS Policies

-- ============================================================================
-- 1. CLEANUP OLD POLICIES
-- ============================================================================
-- Dropping previous broad policies to ensure the new scoped ones take effect.

-- mp_organisations
DROP POLICY IF EXISTS "Organisations are viewable by authenticated users" ON mp_organisations;
DROP POLICY IF EXISTS "Organisations are viewable by anon users during signup" ON mp_organisations;
DROP POLICY IF EXISTS "Supervisors can update their own organisation" ON mp_organisations;
DROP POLICY IF EXISTS "Administrators can manage all organisations" ON mp_organisations;

-- mp_profiles
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON mp_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON mp_profiles;
DROP POLICY IF EXISTS "Supervisors can manage all profiles" ON mp_profiles;
DROP POLICY IF EXISTS "Administrators can manage all profiles" ON mp_profiles;

-- mp_programs
DROP POLICY IF EXISTS "Programs are viewable by organisation members" ON mp_programs;
DROP POLICY IF EXISTS "Supervisors can manage programs" ON mp_programs;
DROP POLICY IF EXISTS "Administrators can manage all programs" ON mp_programs;

-- mp_pairs
DROP POLICY IF EXISTS "Users can view their own pairs" ON mp_pairs;
DROP POLICY IF EXISTS "Supervisors can manage pairs" ON mp_pairs;
DROP POLICY IF EXISTS "Administrators can manage all pairs" ON mp_pairs;

-- mp_meetings
DROP POLICY IF EXISTS "Users can view their meetings" ON mp_meetings;
DROP POLICY IF EXISTS "Pair members can manage meetings" ON mp_meetings;
DROP POLICY IF EXISTS "Supervisors can manage all meetings" ON mp_meetings;
DROP POLICY IF EXISTS "Administrators can manage all meetings" ON mp_meetings;

-- mp_evidence_uploads
DROP POLICY IF EXISTS "evidence_select_policy" ON mp_evidence_uploads;
DROP POLICY IF EXISTS "evidence_insert_policy" ON mp_evidence_uploads;
DROP POLICY IF EXISTS "evidence_mod_policy" ON mp_evidence_uploads;
DROP POLICY IF EXISTS "Administrators can manage all evidence uploads" ON mp_evidence_uploads;

-- ============================================================================
-- 2. APPLY 4-TIER POLICIES
-- ============================================================================

-- --- mp_organisations ---
CREATE POLICY "system_owner_org_all" ON mp_organisations FOR ALL TO authenticated USING (public.is_system_owner());
CREATE POLICY "org_admin_view_own" ON mp_organisations FOR SELECT TO authenticated USING (public.is_org_admin(id));
CREATE POLICY "org_admin_update_own" ON mp_organisations FOR UPDATE TO authenticated USING (public.is_org_admin(id));
CREATE POLICY "public_view_orgs" ON mp_organisations FOR SELECT TO anon USING (true);

-- --- mp_memberships ---
ALTER TABLE mp_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_owner_memberships_all" ON mp_memberships FOR ALL TO authenticated USING (public.is_system_owner());
CREATE POLICY "org_admin_memberships_all" ON mp_memberships FOR ALL TO authenticated USING (public.is_org_admin(organisation_id));
CREATE POLICY "user_view_own_memberships" ON mp_memberships FOR SELECT TO authenticated USING (user_id = auth.uid());

-- --- mp_supervisor_programs ---
ALTER TABLE mp_supervisor_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_owner_sp_all" ON mp_supervisor_programs FOR ALL TO authenticated USING (public.is_system_owner());
CREATE POLICY "org_admin_sp_all" ON mp_supervisor_programs FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM mp_programs p WHERE p.id = program_id AND public.is_org_admin(p.organisation_id)));
CREATE POLICY "supervisor_view_own_sp" ON mp_supervisor_programs FOR SELECT TO authenticated USING (user_id = auth.uid());

-- --- mp_profiles ---
CREATE POLICY "system_owner_profiles_all" ON mp_profiles FOR ALL TO authenticated USING (public.is_system_owner());
CREATE POLICY "org_admin_profiles_all" ON mp_profiles FOR ALL TO authenticated USING (public.is_org_admin(organisation_id));
CREATE POLICY "user_view_profiles_in_org" ON mp_profiles FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM mp_memberships m WHERE m.user_id = auth.uid() AND m.organisation_id = mp_profiles.organisation_id));
CREATE POLICY "user_update_own_profile" ON mp_profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- --- mp_programs ---
CREATE POLICY "system_owner_programs_all" ON mp_programs FOR ALL TO authenticated USING (public.is_system_owner());
CREATE POLICY "org_admin_programs_all" ON mp_programs FOR ALL TO authenticated USING (public.is_org_admin(organisation_id));
CREATE POLICY "supervisor_view_assigned_programs" ON mp_programs FOR SELECT TO authenticated USING (public.is_program_supervisor(id));
CREATE POLICY "member_view_org_programs" ON mp_programs FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM mp_memberships m WHERE m.user_id = auth.uid() AND m.organisation_id = mp_programs.organisation_id));

-- --- mp_pairs ---
CREATE POLICY "system_owner_pairs_all" ON mp_pairs FOR ALL TO authenticated USING (public.is_system_owner());
CREATE POLICY "org_admin_pairs_all" ON mp_pairs FOR ALL TO authenticated USING (public.is_org_admin(organisation_id));
CREATE POLICY "supervisor_pairs_all" ON mp_pairs FOR ALL TO authenticated USING (public.is_program_supervisor(program_id));
CREATE POLICY "member_view_own_pairs" ON mp_pairs FOR SELECT TO authenticated 
  USING (mentor_id = auth.uid() OR mentee_id = auth.uid());

-- --- mp_meetings ---
CREATE POLICY "system_owner_meetings_all" ON mp_meetings FOR ALL TO authenticated USING (public.is_system_owner());
CREATE POLICY "org_admin_meetings_all" ON mp_meetings FOR ALL TO authenticated USING (public.is_org_admin(organisation_id));
CREATE POLICY "supervisor_meetings_all" ON mp_meetings FOR ALL TO authenticated USING (public.is_program_supervisor(program_id));
CREATE POLICY "member_meetings_all" ON mp_meetings FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM mp_pairs p WHERE p.id = pair_id AND (p.mentor_id = auth.uid() OR p.mentee_id = auth.uid())));

-- --- mp_evidence_uploads ---
CREATE POLICY "system_owner_evidence_all" ON mp_evidence_uploads FOR ALL TO authenticated USING (public.is_system_owner());
CREATE POLICY "org_admin_evidence_all" ON mp_evidence_uploads FOR ALL TO authenticated USING (public.is_org_admin(organisation_id));
CREATE POLICY "supervisor_evidence_all" ON mp_evidence_uploads FOR ALL TO authenticated USING (public.is_program_supervisor(program_id));
CREATE POLICY "member_evidence_view" ON mp_evidence_uploads FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM mp_pairs p WHERE p.id = pair_id AND (p.mentor_id = auth.uid() OR p.mentee_id = auth.uid())));
CREATE POLICY "member_evidence_insert" ON mp_evidence_uploads FOR INSERT TO authenticated 
  WITH CHECK (submitted_by = auth.uid());

-- --- mp_tasks_master & mp_subtasks_master ---
DROP POLICY IF EXISTS "Supervisors can manage their organisation's master tasks" ON mp_tasks_master;
DROP POLICY IF EXISTS "Users can view their organisation's master tasks" ON mp_tasks_master;

CREATE POLICY "system_owner_tasks_all" ON mp_tasks_master FOR ALL TO authenticated USING (public.is_system_owner());
CREATE POLICY "org_admin_tasks_all" ON mp_tasks_master FOR ALL TO authenticated USING (public.is_org_admin(organisation_id));
CREATE POLICY "supervisor_tasks_view" ON mp_tasks_master FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM mp_memberships m WHERE m.user_id = auth.uid() AND m.organisation_id = mp_tasks_master.organisation_id));

-- Subtasks usually inherit from parent tasks, but we apply explicit RLS for safety
ALTER TABLE mp_subtasks_master ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subtasks_all_via_parent" ON mp_subtasks_master FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM mp_tasks_master t WHERE t.id = task_id AND (public.is_system_owner() OR public.is_org_admin(t.organisation_id))));
