-- Migration: Fix RLS for Error Logs
-- Description: Ensures any user (authenticated or anon) can report errors to the system.
-- This is critical for catching issues that happen during the auth flow or for users with restricted permissions.

-- 1. DROP EXISTING RESTRICTIVE POLICIES
DROP POLICY IF EXISTS "jwt_error_logs_all_sys_admin" ON public.mp_error_logs;
DROP POLICY IF EXISTS "jwt_error_logs_insert_all" ON public.mp_error_logs;
DROP POLICY IF EXISTS "jwt_error_logs_view" ON public.mp_error_logs;
DROP POLICY IF EXISTS "system_owner_error_logs_all" ON public.mp_error_logs;
DROP POLICY IF EXISTS "org_admin_error_logs_view" ON public.mp_error_logs;

-- 2. CREATE PERMISSIVE INSERT POLICY
-- Allows ANYONE (authenticated or not) to insert logs.
-- This prevents "New row violates RLS" errors when trying to report an error.
CREATE POLICY "error_logs_insert_public" ON public.mp_error_logs 
FOR INSERT TO public 
WITH CHECK (true);

-- 3. CREATE SECURE VIEW POLICY
-- Only Admins and Supervisors can view the logs.
CREATE POLICY "error_logs_view_privileged" ON public.mp_error_logs 
FOR SELECT TO authenticated 
USING (
  public.is_sys_admin() 
  OR public.is_org_admin()
  OR public.is_supervisor()
);

-- 4. CREATE MANAGE POLICY FOR SYS ADMIN
CREATE POLICY "error_logs_manage_admin" ON public.mp_error_logs 
FOR ALL TO authenticated 
USING (public.is_sys_admin());

COMMENT ON POLICY "error_logs_insert_public" ON public.mp_error_logs IS 'Critical: Allows all users to report errors regardless of auth state.';
