-- Migration 081: Separate System Admin and Organisation Admin RLS
-- This migration clarifies the distinction between global system administrators and organisation-level administrators.

-- 1. Redefine is_admin to ONLY mean global System Administrator
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM mp_profiles 
    WHERE id = auth.uid() AND role = 'administrator'
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Define is_org_admin for organisation-level administrators
CREATE OR REPLACE FUNCTION public.is_org_admin() RETURNS boolean
SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM mp_profiles 
    WHERE id = auth.uid() AND role = 'org-admin'
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Update is_privileged to include both admin types and supervisors
CREATE OR REPLACE FUNCTION public.is_privileged() RETURNS boolean
SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN public.is_admin() OR public.is_org_admin() OR public.is_supervisor();
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. Update mp_organisations policies: ONLY Sys Admin can manage organisations
DROP POLICY IF EXISTS "instance_org_admin_manage" ON mp_organisations;
CREATE POLICY "sys_admin_org_manage" ON mp_organisations FOR ALL TO authenticated
  USING (public.is_admin());

-- 5. Update mp_profiles policies: 
-- Sys Admin can manage ALL users (including assigning org-admin role)
-- Org Admin can manage supervisors and program-members, but NOT other admins
DROP POLICY IF EXISTS "instance_profile_admin_manage" ON mp_profiles;

CREATE POLICY "sys_admin_profile_all" ON mp_profiles FOR ALL TO authenticated
  USING (public.is_admin());

CREATE POLICY "org_admin_profile_manage" ON mp_profiles FOR ALL TO authenticated
  USING (
    public.is_org_admin() 
    AND role IN ('supervisor', 'program-member')
  );

-- 6. Storage Bucket Access Review & Hardening

-- mp-avatars: 
-- Sys Admin: All access
-- Org Admin: All access
-- Users: Own folder
DROP POLICY IF EXISTS "instance_avatar_admin_manage" ON storage.objects;
CREATE POLICY "privileged_avatar_manage" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'mp-avatars' AND (public.is_admin() OR public.is_org_admin()));

-- mp-logos:
-- Sys Admin: All access
-- Org Admin: SELECT only (View) - they shouldn't change instance branding if it's flattened
DROP POLICY IF EXISTS "instance_logo_admin_manage" ON storage.objects;
CREATE POLICY "sys_admin_logo_manage" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'mp-logos' AND public.is_admin());

CREATE POLICY "org_admin_logo_view" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'mp-logos' AND public.is_org_admin());

-- mp-evidence-photos:
-- Sys Admin & Org Admin & Supervisors: All access
-- Program Members: Own pair folder
DROP POLICY IF EXISTS "Supervisors full access" ON storage.objects;
CREATE POLICY "privileged_evidence_manage" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'mp-evidence-photos' AND public.is_privileged());
