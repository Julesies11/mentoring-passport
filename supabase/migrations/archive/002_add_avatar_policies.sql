-- Add avatar_url column to mp_profiles if it doesn't exist
ALTER TABLE mp_profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create storage policy for mp-avatars bucket
CREATE POLICY "Users can upload their own avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'mp-avatars' 
  AND (auth.uid()::text = (storage.foldername(name))[1])
);

CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'mp-avatars' 
  AND (auth.uid()::text = (storage.foldername(name))[1])
);

CREATE POLICY "Users can view their own avatars" ON storage.objects
FOR SELECT USING (
  bucket_id = 'mp-avatars' 
  AND (auth.uid()::text = (storage.foldername(name))[1])
);

-- Create policy for supervisors to manage any avatars
CREATE POLICY "Supervisors can manage all avatars" ON storage.objects
FOR ALL USING (
  bucket_id = 'mp-avatars'
  AND EXISTS (
    SELECT 1 FROM mp_profiles 
    WHERE id = auth.uid() 
    AND role = 'supervisor'
  )
);

-- Allow users to update their own avatar_url in profiles
CREATE POLICY "Users can update their own avatar_url" ON mp_profiles
FOR UPDATE USING (
  auth.uid() = id
);

-- Allow supervisors to update any avatar_url
CREATE POLICY "Supervisors can update any avatar_url" ON mp_profiles
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM mp_profiles 
    WHERE id = auth.uid() 
    AND role = 'supervisor'
  )
);

-- Allow everyone to read avatar_url
CREATE POLICY "Everyone can read avatar_url" ON mp_profiles
FOR SELECT USING (true);
