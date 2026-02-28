-- Migration 017: Repair mp_admin_create_user signature
-- This script drops all previous overloaded versions of the function to ensure a clean slate.

-- 1. Drop known variations to prevent "function not unique" errors
DROP FUNCTION IF EXISTS public.mp_admin_create_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.mp_admin_create_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.mp_admin_create_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

-- 2. Create the unified "Gold Standard" version
CREATE OR REPLACE FUNCTION public.mp_admin_create_user(
  email_input TEXT,
  password_input TEXT,
  full_name_input TEXT,
  role_input TEXT,
  job_title_input TEXT DEFAULT NULL,
  department_input TEXT DEFAULT NULL,
  phone_input TEXT DEFAULT NULL,
  avatar_url_input TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  new_user_id UUID;
  caller_role TEXT;
BEGIN
  -- Security: Verify caller is a supervisor
  SELECT role INTO caller_role FROM public.mp_profiles WHERE id = auth.uid();
  IF caller_role != 'supervisor' THEN
    RAISE EXCEPTION 'Access denied: Only supervisors can create users.';
  END IF;

  -- Create the user in auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    email_input,
    crypt(password_input, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', full_name_input, 'role', role_input, 'job_title', job_title_input),
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO new_user_id;

  -- Update the profile with supervisor-specific fields
  UPDATE public.mp_profiles
  SET 
    job_title = job_title_input,
    department = department_input,
    phone = phone_input,
    avatar_url = avatar_url_input,
    must_change_password = true
  WHERE id = new_user_id;

  RETURN new_user_id;
END;
$$;

-- Ensure permissions are correct
GRANT EXECUTE ON FUNCTION public.mp_admin_create_user TO authenticated;
