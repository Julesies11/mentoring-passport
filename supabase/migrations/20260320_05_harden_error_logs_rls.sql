-- Migration: Harden Error Logs RLS
-- Description: Ensures any user (authenticated, anon, or system) can report errors without RLS violations.
-- This is a final, comprehensive fix to ensure system diagnostic reliability.

-- 1. DROP ALL PREVIOUS POLICIES (Start from clean slate for this table)
DROP POLICY IF EXISTS "jwt_error_logs_all_sys_admin" ON public.mp_error_logs;
DROP POLICY IF EXISTS "jwt_error_logs_insert_all" ON public.mp_error_logs;
DROP POLICY IF EXISTS "jwt_error_logs_view" ON public.mp_error_logs;
DROP POLICY IF EXISTS "system_owner_error_logs_all" ON public.mp_error_logs;
DROP POLICY IF EXISTS "org_admin_error_logs_view" ON public.mp_error_logs;
DROP POLICY IF EXISTS "error_logs_insert_public" ON public.mp_error_logs;
DROP POLICY IF EXISTS "error_logs_view_privileged" ON public.mp_error_logs;
DROP POLICY IF EXISTS "error_logs_manage_admin" ON public.mp_error_logs;
DROP POLICY IF EXISTS "error_logs_public_insert_v2" ON public.mp_error_logs;
DROP POLICY IF EXISTS "error_logs_privileged_view_v2" ON public.mp_error_logs;
DROP POLICY IF EXISTS "error_logs_admin_manage_v2" ON public.mp_error_logs;

-- 2. ENSURE RLS IS ACTIVE
ALTER TABLE public.mp_error_logs ENABLE ROW LEVEL SECURITY;

-- 3. CREATE PUBLIC INSERT POLICY
-- Using TO public covers both 'anon' and 'authenticated' roles.
-- This ensures logs are captured even during auth failures or session expiration.
CREATE POLICY "error_logs_public_insert_v3" ON public.mp_error_logs 
FOR INSERT TO public 
WITH CHECK (true);

-- 4. CREATE PRIVILEGED VIEW POLICY
-- Only Admins and Supervisors can read the logs.
-- uses the established is_privileged() helper from baseline
CREATE POLICY "error_logs_privileged_view_v3" ON public.mp_error_logs 
FOR SELECT TO authenticated 
USING (public.is_privileged());

-- 5. CREATE SYSTEM ADMIN FULL ACCESS
CREATE POLICY "error_logs_admin_manage_v3" ON public.mp_error_logs 
FOR ALL TO authenticated 
USING (public.is_sys_admin());

-- 6. ADD TABLE COMMENT FOR DOCUMENTATION
COMMENT ON TABLE public.mp_error_logs IS 'System diagnostic logs. Publicly writable to ensure all system crashes are captured regardless of auth state.';
