-- Migration 082: Harden Profiles and Storage RLS
-- Consolidates overlapping policies, removes public access, and enforces strict role hierarchy.

-- ============================================================================
-- 1. CLEANUP OLD OVERLAPPING POLICIES (mp_profiles)
-- ============================================================================
DROP POLICY IF EXISTS "Everyone can read avatar_url" ON mp_profiles;
DROP POLICY IF EXISTS "Users can update their own avatar_url" ON mp_profiles;
DROP POLICY IF EXISTS "instance_profile_view" ON mp_profiles;
DROP POLICY IF EXISTS "instance_profile_self_update" ON mp_profiles;
DROP POLICY IF EXISTS "jwt_profile_self_view" ON mp_profiles;
DROP POLICY IF EXISTS "jwt_profile_view" ON mp_profiles;
DROP POLICY IF EXISTS "jwt_profile_self_update" ON mp_profiles;
DROP POLICY IF EXISTS "jwt_profile_admin_manage" ON mp_profiles;
DROP POLICY IF EXISTS "sys_admin_profile_all" ON mp_profiles;
DROP POLICY IF EXISTS "org_admin_profile_manage" ON mp_profiles;

-- ============================================================================
-- 2. APPLY UNIFIED HARDENED POLICIES (mp_profiles)
-- ============================================================================

-- SELECT: Users see themselves OR privileged roles see everyone
CREATE POLICY "profiles_select_unified" ON mp_profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_privileged());

-- UPDATE (Self): Users can update their own basic profile fields
-- Restricted to specific columns via app-side validation, but RLS allows the row match
CREATE POLICY "profiles_self_update" ON mp_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ALL (Sys Admin): Global System Owner has full access to manage all users/roles
CREATE POLICY "profiles_sys_admin_all" ON mp_profiles FOR ALL TO authenticated
  USING (public.is_admin());

-- ALL (Org Admin): Org Admins can manage non-admin users (supervisors and members)
CREATE POLICY "profiles_org_admin_manage" ON mp_profiles FOR ALL TO authenticated
  USING (
    public.is_org_admin() 
    AND role IN ('supervisor', 'program-member')
  );

-- ============================================================================
-- 3. STORAGE BUCKET HARDENING (storage.objects)
-- ============================================================================

-- Clean up all generic storage policies to prevent leakage
DROP POLICY IF EXISTS "instance_avatar_view" ON storage.objects;
DROP POLICY IF EXISTS "instance_avatar_self_manage" ON storage.objects;
DROP POLICY IF EXISTS "instance_avatar_admin_manage" ON storage.objects;
DROP POLICY IF EXISTS "privileged_avatar_manage" ON storage.objects;
DROP POLICY IF EXISTS "instance_logo_view" ON storage.objects;
DROP POLICY IF EXISTS "instance_logo_admin_manage" ON storage.objects;
DROP POLICY IF EXISTS "sys_admin_logo_manage" ON storage.objects;
DROP POLICY IF EXISTS "org_admin_logo_view" ON storage.objects;
DROP POLICY IF EXISTS "Supervisors full access" ON storage.objects;
DROP POLICY IF EXISTS "Members view own pair evidence" ON storage.objects;
DROP POLICY IF EXISTS "Members upload to own pair" ON storage.objects;
DROP POLICY IF EXISTS "Members delete from own pair" ON storage.objects;
DROP POLICY IF EXISTS "privileged_evidence_manage" ON storage.objects;

-- --- mp-avatars ---
-- Public view (needed for profile images to render) - Authenticated only
CREATE POLICY "avatars_view_auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'mp-avatars');

-- User manage own folder (uuid/filename)
CREATE POLICY "avatars_self_manage" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'mp-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Privileged manage all
CREATE POLICY "avatars_privileged_all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'mp-avatars' AND public.is_privileged());

-- --- mp-logos ---
-- Everyone can view branding
CREATE POLICY "logos_view_auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'mp-logos');

-- ONLY Sys Admin can manage instance logos
CREATE POLICY "logos_sys_admin_all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'mp-logos' AND public.is_admin());

-- --- mp-evidence-photos ---
-- SELECT: Users see their own pair folder OR privileged see all
CREATE POLICY "evidence_select_unified" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'mp-evidence-photos' 
    AND (
      public.is_privileged()
      OR EXISTS (
        SELECT 1 FROM mp_pairs
        WHERE mp_pairs.id::text = (storage.foldername(name))[1]
        AND (mentor_id = auth.uid() OR mentee_id = auth.uid())
      )
    )
  );

-- INSERT/UPDATE/DELETE: Users manage own pair folder OR privileged see all
CREATE POLICY "evidence_manage_unified" ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'mp-evidence-photos' 
    AND (
      public.is_privileged()
      OR EXISTS (
        SELECT 1 FROM mp_pairs
        WHERE mp_pairs.id::text = (storage.foldername(name))[1]
        AND (mentor_id = auth.uid() OR mentee_id = auth.uid())
      )
    )
  );
