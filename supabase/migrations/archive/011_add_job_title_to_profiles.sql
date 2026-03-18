-- Add job_title column to mp_profiles
ALTER TABLE mp_profiles ADD COLUMN job_title TEXT;

-- Update the profile creation trigger to handle job_title if passed in metadata
CREATE OR REPLACE FUNCTION public.mp_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.mp_profiles (id, email, role, full_name, job_title, status)
  VALUES (
    NEW.id,
    NEW.email,
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', '') = 'supervisor' THEN 'supervisor'
      ELSE 'program-member'
    END,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'job_title', ''),
    'active'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
