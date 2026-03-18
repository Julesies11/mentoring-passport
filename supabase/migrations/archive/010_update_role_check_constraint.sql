-- 1. Update any existing legacy roles to 'program-member'
UPDATE mp_profiles SET role = 'program-member' WHERE role IN ('mentor', 'mentee');

-- 2. Update the role check constraint to ONLY include 'supervisor' and 'program-member'
ALTER TABLE mp_profiles DROP CONSTRAINT IF EXISTS mp_profiles_role_check;

ALTER TABLE mp_profiles ADD CONSTRAINT mp_profiles_role_check 
CHECK (role IN ('supervisor', 'program-member'));

-- 3. Update the profile creation trigger to use 'program-member' as strict default
CREATE OR REPLACE FUNCTION public.mp_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.mp_profiles (id, email, role, full_name, status)
  VALUES (
    NEW.id,
    NEW.email,
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', '') = 'supervisor' THEN 'supervisor'
      ELSE 'program-member'
    END,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'active'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
