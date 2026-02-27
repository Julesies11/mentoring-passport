-- 1. Ensure required extensions are available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Refine the profile creation trigger (The "Gold Standard" part)
-- This ensures that ANY user created in auth.users (via signup or admin) 
-- automatically gets a profile record.
CREATE OR REPLACE FUNCTION public.mp_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.mp_profiles (id, email, role, full_name, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'mentee'), -- Use metadata role or default to mentee
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'active'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Secure Admin Function for Supervisor use
-- This function allows a supervisor to create a user in auth.users
-- without the session-swap side effects of the standard signUp API.
CREATE OR REPLACE FUNCTION public.mp_admin_create_user(
  email_input TEXT,
  password_input TEXT,
  full_name_input TEXT,
  role_input TEXT,
  department_input TEXT DEFAULT NULL,
  phone_input TEXT DEFAULT NULL,
  avatar_url_input TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with service_role privileges
SET search_path = public, auth, extensions -- Added extensions to search_path for pgcrypto
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
  -- This handles the password hashing and identity root
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
    crypt(password_input, gen_salt('bf')), -- Now finds gen_salt in extensions schema
    now(), -- Auto-confirm email
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', full_name_input, 'role', role_input),
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO new_user_id;

  -- Update the profile with supervisor-specific fields
  -- (The basic profile was already created by the mp_handle_new_user trigger)
  UPDATE public.mp_profiles
  SET 
    department = department_input,
    phone = phone_input,
    avatar_url = avatar_url_input,
    must_change_password = true
  WHERE id = new_user_id;

  RETURN new_user_id;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.mp_admin_create_user TO authenticated;
