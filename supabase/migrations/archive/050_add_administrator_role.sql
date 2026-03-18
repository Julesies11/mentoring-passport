-- Migration 050: Add Administrator role and God-mode access

-- 1. Update the role check constraint to include 'administrator'
ALTER TABLE public.mp_profiles DROP CONSTRAINT IF EXISTS mp_profiles_role_check;

ALTER TABLE public.mp_profiles ADD CONSTRAINT mp_profiles_role_check
CHECK (role IN ('supervisor', 'program-member', 'administrator'));

-- 2. Update mp_handle_new_user to handle administrator role
CREATE OR REPLACE FUNCTION public.mp_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.mp_profiles (id, email, role, full_name, status, organisation_id)
  VALUES (
    NEW.id,
    NEW.email,
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', '') = 'administrator' THEN 'administrator'
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', '') = 'supervisor' THEN 'supervisor'
      ELSE 'program-member'
    END,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'active',
    (NULLIF(NEW.raw_user_meta_data->>'organisation_id', ''))::UUID
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    organisation_id = EXCLUDED.organisation_id,
    full_name = EXCLUDED.full_name;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update mp_admin_create_user to handle organisation_id and allow admins to call it
DROP FUNCTION IF EXISTS public.mp_admin_create_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.mp_admin_create_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.mp_admin_create_user(
  email_input TEXT,
  password_input TEXT,
  full_name_input TEXT,
  role_input TEXT,
  organisation_id_input UUID DEFAULT NULL,
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
  caller_org_id UUID;
BEGIN
  -- Get caller profile info
  SELECT role, organisation_id INTO caller_role, caller_org_id FROM public.mp_profiles WHERE id = auth.uid();
  
  -- Security check
  IF caller_role NOT IN ('administrator', 'supervisor') THEN
    RAISE EXCEPTION 'Access denied: Only administrators and supervisors can create users.';
  END IF;

  -- Supervisor can only create users in their own organisation
  IF caller_role = 'supervisor' THEN
    IF organisation_id_input IS NOT NULL AND organisation_id_input != caller_org_id THEN
       RAISE EXCEPTION 'Access denied: Supervisors can only create users in their own organisation.';
    END IF;
    organisation_id_input := caller_org_id;
  END IF;
  
  -- Administrators can set any organisation_id (or NULL)

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
    jsonb_build_object(
        'full_name', full_name_input, 
        'role', role_input, 
        'job_title', job_title_input, 
        'organisation_id', organisation_id_input
    ),
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO new_user_id;

  -- Update the profile with additional fields (the trigger handles role and org_id)
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

GRANT EXECUTE ON FUNCTION public.mp_admin_create_user TO authenticated;

-- 4. Atomic Organisation Setup Function
CREATE OR REPLACE FUNCTION public.mp_admin_setup_organisation(
  org_name TEXT,
  supervisor_email TEXT,
  supervisor_password TEXT,
  supervisor_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  new_org_id UUID;
  caller_role TEXT;
BEGIN
  -- Verify caller is administrator
  SELECT role INTO caller_role FROM public.mp_profiles WHERE id = auth.uid();
  IF caller_role != 'administrator' THEN
    RAISE EXCEPTION 'Access denied: Only administrators can setup organisations.';
  END IF;

  -- 1. Create Organisation
  INSERT INTO public.mp_organisations (name)
  VALUES (org_name)
  RETURNING id INTO new_org_id;

  -- 2. Create Supervisor
  PERFORM public.mp_admin_create_user(
    supervisor_email,
    supervisor_password,
    supervisor_name,
    'supervisor',
    new_org_id
  );

  RETURN new_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mp_admin_setup_organisation TO authenticated;

-- 5. Add Administrator God-mode policies to all key tables

-- mp_organisations
DROP POLICY IF EXISTS "Administrators can manage all organisations" ON mp_organisations;
CREATE POLICY "Administrators can manage all organisations"
  ON mp_organisations FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM mp_profiles WHERE id = auth.uid() AND role = 'administrator'));

-- mp_profiles
DROP POLICY IF EXISTS "Administrators can manage all profiles" ON mp_profiles;
CREATE POLICY "Administrators can manage all profiles"
  ON mp_profiles FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM mp_profiles WHERE id = auth.uid() AND role = 'administrator'));

-- mp_programs
DROP POLICY IF EXISTS "Administrators can manage all programs" ON mp_programs;
CREATE POLICY "Administrators can manage all programs"
  ON mp_programs FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM mp_profiles WHERE id = auth.uid() AND role = 'administrator'));

-- mp_tasks_master
DROP POLICY IF EXISTS "Administrators can manage all master tasks" ON mp_tasks_master;
CREATE POLICY "Administrators can manage all master tasks"
  ON mp_tasks_master FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM mp_profiles WHERE id = auth.uid() AND role = 'administrator'));

-- mp_pairs
DROP POLICY IF EXISTS "Administrators can manage all pairs" ON mp_pairs;
CREATE POLICY "Administrators can manage all pairs"
  ON mp_pairs FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM mp_profiles WHERE id = auth.uid() AND role = 'administrator'));

-- mp_meetings
DROP POLICY IF EXISTS "Administrators can manage all meetings" ON mp_meetings;
CREATE POLICY "Administrators can manage all meetings"
  ON mp_meetings FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM mp_profiles WHERE id = auth.uid() AND role = 'administrator'));

-- mp_evidence_uploads
DROP POLICY IF EXISTS "Administrators can manage all evidence uploads" ON mp_evidence_uploads;
CREATE POLICY "Administrators can manage all evidence uploads"
  ON mp_evidence_uploads FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM mp_profiles WHERE id = auth.uid() AND role = 'administrator'));

-- Storage Policies
-- Note: Using simple blanket policies for Admin in storage.
-- Administrators should be able to do everything in relevant buckets.

-- mp-logos
DROP POLICY IF EXISTS "Administrators can manage all logos" ON storage.objects;
CREATE POLICY "Administrators can manage all logos"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'mp-logos' 
    AND EXISTS (SELECT 1 FROM public.mp_profiles WHERE id = auth.uid() AND role = 'administrator')
  );

-- mp-avatars
DROP POLICY IF EXISTS "Administrators can manage all avatars" ON storage.objects;
CREATE POLICY "Administrators can manage all avatars"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'mp-avatars' 
    AND EXISTS (SELECT 1 FROM public.mp_profiles WHERE id = auth.uid() AND role = 'administrator')
  );

-- mp-evidence
DROP POLICY IF EXISTS "Administrators can manage all evidence files" ON storage.objects;
CREATE POLICY "Administrators can manage all evidence files"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'mp-evidence' 
    AND EXISTS (SELECT 1 FROM public.mp_profiles WHERE id = auth.uid() AND role = 'administrator')
  );
