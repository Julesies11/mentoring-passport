-- Migration 078: Fix Recursive RLS (Security Definer)
-- Updates the instance helpers to be SECURITY DEFINER to bypass RLS and prevent infinite recursion when querying mp_profiles.

-- 1. Redefine is_admin with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean 
SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM mp_profiles 
    WHERE id = auth.uid() AND role IN ('administrator', 'org-admin')
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Redefine is_supervisor with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_supervisor(p_program_id uuid DEFAULT NULL) RETURNS boolean 
SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM mp_profiles p
    LEFT JOIN mp_supervisor_programs sp ON p.id = sp.user_id
    WHERE p.id = auth.uid() 
    AND p.role = 'supervisor'
    AND (p_program_id IS NULL OR sp.program_id = p_program_id)
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Redefine is_privileged (Optional, since it relies on the other two, but good practice)
CREATE OR REPLACE FUNCTION public.is_privileged() RETURNS boolean 
SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN public.is_admin() OR public.is_supervisor();
END;
$$ LANGUAGE plpgsql STABLE;
