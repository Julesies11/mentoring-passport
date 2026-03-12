-- Migration 051: Fix RLS Recursion on mp_profiles

-- 1. Create a security definer function to check roles without recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.mp_profiles
    WHERE id = auth.uid() AND role = 'administrator'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update the mp_profiles policy to use the helper function
DROP POLICY IF EXISTS "Administrators can manage all profiles" ON public.mp_profiles;

CREATE POLICY "Administrators can manage all profiles"
  ON public.mp_profiles FOR ALL
  TO authenticated
  USING (public.is_admin());

-- 3. Also update other policies to use this more efficient check
DROP POLICY IF EXISTS "Administrators can manage all organisations" ON public.mp_organisations;
CREATE POLICY "Administrators can manage all organisations"
  ON public.mp_organisations FOR ALL
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Administrators can manage all programs" ON public.mp_programs;
CREATE POLICY "Administrators can manage all programs"
  ON public.mp_programs FOR ALL
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Administrators can manage all master tasks" ON public.mp_tasks_master;
CREATE POLICY "Administrators can manage all master tasks"
  ON public.mp_tasks_master FOR ALL
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Administrators can manage all pairs" ON public.mp_pairs;
CREATE POLICY "Administrators can manage all pairs"
  ON public.mp_pairs FOR ALL
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Administrators can manage all meetings" ON public.mp_meetings;
CREATE POLICY "Administrators can manage all meetings"
  ON public.mp_meetings FOR ALL
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Administrators can manage all evidence uploads" ON public.mp_evidence_uploads;
CREATE POLICY "Administrators can manage all evidence uploads"
  ON public.mp_evidence_uploads FOR ALL
  TO authenticated
  USING (public.is_admin());

-- 4. Fix Storage Policies as well
DROP POLICY IF EXISTS "Administrators can manage all logos" ON storage.objects;
CREATE POLICY "Administrators can manage all logos"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'mp-logos' AND public.is_admin());

DROP POLICY IF EXISTS "Administrators can manage all avatars" ON storage.objects;
CREATE POLICY "Administrators can manage all avatars"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'mp-avatars' AND public.is_admin());

DROP POLICY IF EXISTS "Administrators can manage all evidence files" ON storage.objects;
CREATE POLICY "Administrators can manage all evidence files"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'mp-evidence' AND public.is_admin());
