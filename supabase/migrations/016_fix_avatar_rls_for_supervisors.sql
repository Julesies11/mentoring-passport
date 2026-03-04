-- Update storage policies for mp-avatars to allow supervisors to manage any avatar

-- 1. Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- 2. Re-create policies with supervisor support
CREATE POLICY "Users can upload avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'mp-avatars' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR 
      (SELECT role FROM public.mp_profiles WHERE id = auth.uid()) = 'supervisor'
    )
  );

CREATE POLICY "Users can update avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'mp-avatars' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR 
      (SELECT role FROM public.mp_profiles WHERE id = auth.uid()) = 'supervisor'
    )
  );

CREATE POLICY "Users can delete avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'mp-avatars' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR 
      (SELECT role FROM public.mp_profiles WHERE id = auth.uid()) = 'supervisor'
    )
  );
