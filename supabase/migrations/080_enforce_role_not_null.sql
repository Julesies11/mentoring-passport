-- Migration 080: Enforce Role Not Null and Update Constraints
-- This ensures that every profile has a valid role and prevents data integrity issues.

-- 1. Ensure all profiles have a default role if null (just in case)
UPDATE public.mp_profiles SET role = 'program-member' WHERE role IS NULL;

-- 2. Set the role column to NOT NULL
ALTER TABLE public.mp_profiles ALTER COLUMN role SET NOT NULL;

-- 3. Ensure the check constraint is up-to-date with all current roles
ALTER TABLE public.mp_profiles DROP CONSTRAINT IF EXISTS mp_profiles_role_check;
ALTER TABLE public.mp_profiles ADD CONSTRAINT mp_profiles_role_check
  CHECK (role = ANY (ARRAY['administrator'::text, 'org-admin'::text, 'supervisor'::text, 'program-member'::text]));

-- 4. Update the trigger function to be more resilient and avoid NULLs
CREATE OR REPLACE FUNCTION public.mp_handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT;
BEGIN
    -- Determine role from metadata, default to 'program-member'
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'program-member');
    
    -- Validate the role against allowed values
    IF v_role NOT IN ('administrator', 'org-admin', 'supervisor', 'program-member') THEN
        v_role := 'program-member';
    END IF;

    INSERT INTO public.mp_profiles (
        id, 
        email, 
        role, 
        full_name, 
        job_title,
        status,
        must_change_password
    )
    VALUES (
        NEW.id,
        NEW.email,
        v_role,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'job_title', ''),
        'active',
        COALESCE((NEW.raw_user_meta_data->>'must_change_password')::boolean, false)
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        full_name = EXCLUDED.full_name;
        
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
