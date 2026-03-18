-- Migration 091: JWT-Based Security & Recursion Fix (Total Refresh)
-- This migration breaks the RLS recursion loop by moving role checks to JWT metadata.
-- It performs a total policy refresh to clear function dependencies.

-- ============================================================================
-- 1. PREPARE: Drop all existing policies to clear dependencies
-- ============================================================================
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- Public schema policies
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
    END LOOP;
    
    -- Storage schema policies
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON storage.objects';
    END LOOP;
END $$;

-- ============================================================================
-- 2. ROLE SYNC TRIGGER (The Engine)
-- ============================================================================

-- Function to sync mp_profiles role to auth.users app_metadata
CREATE OR REPLACE FUNCTION public.sync_user_role()
RETURNS TRIGGER 
SECURITY DEFINER SET search_path = public, auth, extensions AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_user_role ON public.mp_profiles;
CREATE TRIGGER tr_sync_user_role
AFTER INSERT OR UPDATE OF role ON public.mp_profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_user_role();

-- Backfill existing users
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT id, role FROM public.mp_profiles) 
    LOOP
        UPDATE auth.users
        SET raw_app_meta_data = 
          COALESCE(raw_app_meta_data, '{}'::jsonb) || 
          jsonb_build_object('role', r.role)
        WHERE id = r.id;
    END LOOP;
END $$;

-- ============================================================================
-- 3. JWT-BASED SECURITY HELPERS (Zero-Recursion)
-- ============================================================================

-- Global System Admin
CREATE OR REPLACE FUNCTION public.is_sys_admin() RETURNS boolean 
SECURITY DEFINER SET search_path = public AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'role') = 'administrator';
$$ LANGUAGE SQL STABLE;

-- Organisation Level Admin
CREATE OR REPLACE FUNCTION public.is_org_admin() RETURNS boolean 
SECURITY DEFINER SET search_path = public AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'role') = 'org-admin';
$$ LANGUAGE SQL STABLE;

-- Supervisor
CREATE OR REPLACE FUNCTION public.is_supervisor(p_program_id uuid DEFAULT NULL) RETURNS boolean 
SECURITY DEFINER SET search_path = public AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'role') = 'supervisor'
  AND (
    p_program_id IS NULL 
    OR EXISTS (
      SELECT 1 FROM mp_supervisor_programs 
      WHERE user_id = auth.uid() AND program_id = p_program_id
    )
  );
$$ LANGUAGE SQL STABLE;

-- Privileged check
CREATE OR REPLACE FUNCTION public.is_privileged() RETURNS boolean 
SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_sys_admin() OR public.is_org_admin() OR public.is_supervisor();
$$ LANGUAGE SQL STABLE;

-- Pair Membership check
CREATE OR REPLACE FUNCTION public.is_pair_member(p_pair_id uuid) RETURNS boolean 
SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM mp_pairs 
    WHERE id = p_pair_id AND (mentor_id = auth.uid() OR mentee_id = auth.uid())
  );
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- 4. RE-APPLY ALL POLICIES (Unified & Non-Recursive)
-- ============================================================================

-- --- mp_profiles ---
CREATE POLICY "profile_view" ON mp_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profile_self_update" ON mp_profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "profile_sys_admin_all" ON mp_profiles FOR ALL TO authenticated USING (public.is_sys_admin());
CREATE POLICY "profile_org_admin_manage" ON mp_profiles FOR ALL TO authenticated 
  USING (public.is_org_admin() AND role IN ('supervisor', 'program-member'));

-- --- mp_organisations ---
CREATE POLICY "org_view" ON mp_organisations FOR SELECT TO authenticated USING (true);
CREATE POLICY "org_sys_admin_all" ON mp_organisations FOR ALL TO authenticated USING (public.is_sys_admin());

-- --- mp_programs ---
CREATE POLICY "program_view" ON mp_programs FOR SELECT TO authenticated 
  USING (public.is_sys_admin() OR public.is_org_admin() OR public.is_supervisor(id) OR EXISTS (SELECT 1 FROM mp_pairs WHERE program_id = mp_programs.id AND (mentor_id = auth.uid() OR mentee_id = auth.uid())));
CREATE POLICY "program_admin_manage" ON mp_programs FOR ALL TO authenticated USING (public.is_sys_admin() OR public.is_org_admin());

-- --- mp_pairs ---
CREATE POLICY "pair_view" ON mp_pairs FOR SELECT TO authenticated 
  USING (public.is_sys_admin() OR public.is_org_admin() OR public.is_supervisor(program_id) OR mentor_id = auth.uid() OR mentee_id = auth.uid());
CREATE POLICY "pair_privileged_manage" ON mp_pairs FOR ALL TO authenticated 
  USING (public.is_sys_admin() OR public.is_org_admin() OR public.is_supervisor(program_id));

-- --- Master Task Templates ---
CREATE POLICY "master_template_view" ON mp_task_lists_master FOR SELECT TO authenticated USING (true);
CREATE POLICY "master_template_admin" ON mp_task_lists_master FOR ALL TO authenticated USING (public.is_sys_admin() OR public.is_org_admin());

CREATE POLICY "master_task_view" ON mp_tasks_master FOR SELECT TO authenticated USING (true);
CREATE POLICY "master_task_admin" ON mp_tasks_master FOR ALL TO authenticated USING (public.is_sys_admin() OR public.is_org_admin());

CREATE POLICY "master_subtask_view" ON mp_subtasks_master FOR SELECT TO authenticated USING (true);
CREATE POLICY "master_subtask_admin" ON mp_subtasks_master FOR ALL TO authenticated USING (public.is_sys_admin() OR public.is_org_admin());

-- --- Program Tasks & Subtasks ---
CREATE POLICY "program_task_view" ON mp_program_tasks FOR SELECT TO authenticated 
  USING (public.is_sys_admin() OR public.is_org_admin() OR public.is_supervisor(program_id) OR EXISTS (SELECT 1 FROM mp_pairs WHERE program_id = mp_program_tasks.program_id AND (mentor_id = auth.uid() OR mentee_id = auth.uid())));
CREATE POLICY "program_task_manage" ON mp_program_tasks FOR ALL TO authenticated 
  USING (public.is_sys_admin() OR public.is_org_admin() OR public.is_supervisor(program_id));

CREATE POLICY "program_subtask_view" ON mp_program_subtasks FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM mp_program_tasks pt WHERE pt.id = program_task_id));
CREATE POLICY "program_subtask_manage" ON mp_program_subtasks FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM mp_program_tasks pt WHERE pt.id = program_task_id AND (public.is_sys_admin() OR public.is_org_admin() OR public.is_supervisor(pt.program_id))));

-- --- Pair Tasks & Subtasks ---
CREATE POLICY "pair_task_view" ON mp_pair_tasks FOR SELECT TO authenticated 
  USING (public.is_sys_admin() OR public.is_org_admin() OR public.is_supervisor(program_id) OR public.is_pair_member(pair_id));
CREATE POLICY "pair_task_update" ON mp_pair_tasks FOR UPDATE TO authenticated 
  USING (public.is_sys_admin() OR public.is_org_admin() OR public.is_supervisor(program_id) OR public.is_pair_member(pair_id));
CREATE POLICY "pair_task_admin" ON mp_pair_tasks FOR ALL TO authenticated 
  USING (public.is_sys_admin() OR public.is_org_admin() OR public.is_supervisor(program_id));

CREATE POLICY "pair_subtask_view" ON mp_pair_subtasks FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM mp_pair_tasks pt WHERE pt.id = pair_task_id AND (public.is_sys_admin() OR public.is_org_admin() OR public.is_supervisor(pt.program_id) OR public.is_pair_member(pt.pair_id))));
CREATE POLICY "pair_subtask_all" ON mp_pair_subtasks FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM mp_pair_tasks pt WHERE pt.id = pair_task_id AND (public.is_sys_admin() OR public.is_org_admin() OR public.is_supervisor(pt.program_id) OR public.is_pair_member(pt.pair_id))));

-- --- mp_meetings ---
CREATE POLICY "meeting_view" ON mp_meetings FOR SELECT TO authenticated 
  USING (public.is_sys_admin() OR public.is_org_admin() OR public.is_supervisor(program_id) OR public.is_pair_member(pair_id));
CREATE POLICY "meeting_all" ON mp_meetings FOR ALL TO authenticated 
  USING (public.is_sys_admin() OR public.is_org_admin() OR public.is_supervisor(program_id) OR public.is_pair_member(pair_id));

-- --- mp_evidence_uploads ---
CREATE POLICY "evidence_view" ON mp_evidence_uploads FOR SELECT TO authenticated 
  USING (public.is_sys_admin() OR public.is_org_admin() OR public.is_supervisor(program_id) OR public.is_pair_member(pair_id));
CREATE POLICY "evidence_insert" ON mp_evidence_uploads FOR INSERT TO authenticated 
  WITH CHECK (public.is_sys_admin() OR public.is_org_admin() OR public.is_supervisor(program_id) OR public.is_pair_member(pair_id));
CREATE POLICY "evidence_manage" ON mp_evidence_uploads FOR ALL TO authenticated 
  USING (public.is_sys_admin() OR public.is_org_admin() OR public.is_supervisor(program_id) OR submitted_by = auth.uid());

-- --- mp_evidence_types ---
CREATE POLICY "evidence_type_view" ON mp_evidence_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "evidence_type_admin" ON mp_evidence_types FOR ALL TO authenticated USING (public.is_sys_admin());

-- --- mp_notifications ---
CREATE POLICY "notifications_self" ON mp_notifications FOR ALL TO authenticated USING (recipient_id = auth.uid());
CREATE POLICY "notifications_system_insert" ON mp_notifications FOR INSERT TO authenticated WITH CHECK (true);

-- --- mp_supervisor_programs ---
CREATE POLICY "sp_view" ON mp_supervisor_programs FOR SELECT TO authenticated USING (true);
CREATE POLICY "sp_admin" ON mp_supervisor_programs FOR ALL TO authenticated USING (public.is_sys_admin() OR public.is_org_admin());

-- --- Storage Policies ---
CREATE POLICY "avatars_view" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'mp-avatars');
CREATE POLICY "avatars_self_manage" ON storage.objects FOR ALL TO authenticated 
  USING (bucket_id = 'mp-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_privileged_manage" ON storage.objects FOR ALL TO authenticated 
  USING (bucket_id = 'mp-avatars' AND public.is_privileged());

CREATE POLICY "logos_view" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'mp-logos');
CREATE POLICY "logos_admin_manage" ON storage.objects FOR ALL TO authenticated 
  USING (bucket_id = 'mp-logos' AND public.is_sys_admin());

CREATE POLICY "evidence_files_view" ON storage.objects FOR SELECT TO authenticated 
  USING (bucket_id = 'mp-evidence-photos' AND (public.is_privileged() OR public.is_pair_member((storage.foldername(name))[1]::uuid)));
CREATE POLICY "evidence_files_manage" ON storage.objects FOR ALL TO authenticated 
  USING (bucket_id = 'mp-evidence-photos' AND (public.is_privileged() OR public.is_pair_member((storage.foldername(name))[1]::uuid)));

-- ============================================================================
-- 5. CLEANUP: Drop old functions
-- ============================================================================
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
