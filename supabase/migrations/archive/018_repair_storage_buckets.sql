-- Migration 018: Repair and Initialize Storage Buckets
-- This script ensures all required storage buckets exist and have the correct policies.

-- 1. Create buckets if they don't exist
-- We use the storage.buckets table directly as it's the standard way in migrations
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('mp-avatars', 'mp-avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  ('mp-evidence-photos', 'mp-evidence-photos', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Drop existing policies to ensure a clean state
-- Avatars
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Evidence
DROP POLICY IF EXISTS "Authenticated users can upload evidence photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view evidence photos for their pairs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their pending evidence photos" ON storage.objects;
DROP POLICY IF EXISTS "Supervisors can manage all evidence photos" ON storage.objects;

-- 3. Create fresh policies for mp-avatars (Publicly viewable)
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'mp-avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'mp-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'mp-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'mp-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4. Create fresh policies for mp-evidence-photos (Private/Secure)
CREATE POLICY "Authenticated users can upload evidence photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'mp-evidence-photos');

CREATE POLICY "Users can view evidence photos for their pairs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'mp-evidence-photos'
    AND (
      -- Extract the pair_id from the path (assumes path starts with pair_id/)
      EXISTS (
        SELECT 1 FROM public.mp_pairs p
        WHERE p.id::text = (storage.foldername(name))[1]
        AND (p.mentor_id = auth.uid() OR p.mentee_id = auth.uid() OR (SELECT role FROM public.mp_profiles WHERE id = auth.uid()) = 'supervisor')
      )
    )
  );

CREATE POLICY "Supervisors can manage all evidence photos"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'mp-evidence-photos' 
    AND (SELECT role FROM public.mp_profiles WHERE id = auth.uid()) = 'supervisor'
  );
