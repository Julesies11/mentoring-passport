-- Migration 057: Remove redundant role field from mp_profiles and fix RLS for org-admin

-- ============================================================================
-- 1. COMPREHENSIVE CLEANUP OF DEPENDENT OBJECTS (MANDATORY)
-- ============================================================================

-- --- Drop policies on storage.objects ---
DROP POLICY IF EXISTS "storage_all_supervisor" ON storage.objects;
DROP POLICY IF EXISTS "org_admin_manage_avatars" ON storage.objects;
DROP POLICY IF EXISTS "Supervisors can manage all avatars in their org" ON storage.objects;
DROP POLICY IF EXISTS "Supervisors can manage all avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can view evidence photos for their pairs" ON storage.objects;
DROP POLICY IF EXISTS "Supervisors can manage all evidence photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Supervisors can upload logos for their organisation" ON storage.objects;
DROP POLICY IF EXISTS "Supervisors can update logos for their organisation" ON storage.objects;

-- --- Drop policies on mp_pairs ---
DROP POLICY IF EXISTS "Supervisors can view all pairs" ON mp_pairs;
DROP POLICY IF EXISTS "Supervisors can manage pairs" ON mp_pairs;
DROP POLICY IF EXISTS "Supervisors can insert pairs" ON mp_pairs;
DROP POLICY IF EXISTS "Supervisors can update pairs" ON mp_pairs;
DROP POLICY IF EXISTS "Supervisors can delete pairs" ON mp_pairs;

-- --- Drop policies on mp_profiles ---
DROP POLICY IF EXISTS "Supervisors can view all profiles" ON mp_profiles;
DROP POLICY IF EXISTS "Supervisors can manage all profiles" ON mp_profiles;
DROP POLICY IF EXISTS "org_admin_profiles_all" ON mp_profiles;
DROP POLICY IF EXISTS "Supervisors can update any avatar_url" ON mp_profiles;

-- --- Drop policies on mp_pair_tasks ---
DROP POLICY IF EXISTS "Supervisors can insert pair tasks" ON mp_pair_tasks;
DROP POLICY IF EXISTS "Supervisors can manage all pair tasks" ON mp_pair_tasks;

-- --- Drop policies on mp_subtasks_master ---
DROP POLICY IF EXISTS "Supervisors can manage all master subtasks" ON mp_subtasks_master;
DROP POLICY IF EXISTS "Supervisors can view all master subtasks" ON mp_subtasks_master;

-- --- Drop policies on mp_error_logs ---
DROP POLICY IF EXISTS "Supervisors can view error logs" ON mp_error_logs;
DROP POLICY IF EXISTS "Supervisors can view all error logs" ON mp_error_logs;

-- --- Drop policies on mp_notifications ---
DROP POLICY IF EXISTS "Users can view their own notifications" ON mp_notifications;

-- --- Drop legacy functions ---
DROP FUNCTION IF EXISTS public.mp_get_my_role() CASCADE;
DROP FUNCTION IF EXISTS public.mp_mp_get_my_role() CASCADE;

-- ============================================================================
-- 2. UPDATE HELPER FUNCTIONS
-- ============================================================================

-- Update is_system_owner to check auth.users metadata
CREATE OR REPLACE FUNCTION public.is_system_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT (raw_user_meta_data->>'role' = 'administrator')
    FROM auth.users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. UPDATE TRIGGER FUNCTIONS
-- ============================================================================

-- Update mp_handle_new_user
CREATE OR REPLACE FUNCTION public.mp_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.mp_profiles (id, email, full_name, status, organisation_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'active',
    (NULLIF(NEW.raw_user_meta_data->>'organisation_id', ''))::UUID
  )
  ON CONFLICT (id) DO UPDATE SET
    organisation_id = EXCLUDED.organisation_id,
    full_name = EXCLUDED.full_name;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update mp_admin_create_user
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
  caller_is_admin BOOLEAN;
BEGIN
  -- Security check
  caller_is_admin := public.is_system_owner();
  
  -- If not global admin, must be an org-admin of the target organisation
  IF NOT caller_is_admin THEN
    IF NOT public.is_org_admin(organisation_id_input) THEN
      RAISE EXCEPTION 'Access denied: You must be an administrator or org-admin to create users.';
    END IF;
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

  -- Update the profile
  UPDATE public.mp_profiles
  SET 
    job_title = job_title_input,
    department = department_input,
    phone = phone_input,
    avatar_url = avatar_url_input,
    must_change_password = true
  WHERE id = new_user_id;

  -- Create membership
  INSERT INTO public.mp_memberships (user_id, organisation_id, role, status)
  VALUES (new_user_id, organisation_id_input, role_input::public.mp_membership_role, 'active');

  RETURN new_user_id;
END;
$$;

-- ============================================================================
-- 4. DROP REDUNDANT COLUMN
-- ============================================================================

-- Drop the role check constraint first
ALTER TABLE public.mp_profiles DROP CONSTRAINT IF EXISTS mp_profiles_role_check;

-- Drop the column
ALTER TABLE public.mp_profiles DROP COLUMN IF EXISTS role;

-- ============================================================================
-- 5. RE-APPLY MODERN RLS POLICIES (THE RIGHT WAY)
-- ============================================================================

-- --- mp_profiles ---
DROP POLICY IF EXISTS "org_admin_profiles_all" ON mp_profiles;
CREATE POLICY "org_admin_profiles_all" ON mp_profiles FOR ALL TO authenticated 
  USING (public.is_org_admin(organisation_id));

DROP POLICY IF EXISTS "user_view_profiles_in_org" ON mp_profiles;
CREATE POLICY "user_view_profiles_in_org" ON mp_profiles FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM mp_memberships m WHERE m.user_id = auth.uid() AND m.organisation_id = mp_profiles.organisation_id));

DROP POLICY IF EXISTS "user_update_own_profile" ON mp_profiles;
CREATE POLICY "user_update_own_profile" ON mp_profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- --- mp_notifications ---
DROP POLICY IF EXISTS "notifications_view_scoped" ON mp_notifications;
CREATE POLICY "notifications_view_scoped" ON mp_notifications FOR SELECT TO authenticated
  USING (
    recipient_id = auth.uid() 
    OR public.is_system_owner()
  );

-- --- storage.objects ---
-- Broad policies for admins/system owners, scoped for org admins
DROP POLICY IF EXISTS "org_admin_manage_avatars" ON storage.objects;
CREATE POLICY "org_admin_manage_avatars" ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'mp-avatars' 
    AND (
      public.is_system_owner() 
      OR EXISTS (
        SELECT 1 FROM mp_profiles p 
        WHERE p.id::text = (storage.foldername(name))[1] 
        AND public.is_org_admin(p.organisation_id)
      )
    )
  );

DROP POLICY IF EXISTS "org_admin_manage_logos" ON storage.objects;
CREATE POLICY "org_admin_manage_logos" ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'mp-logos'
    AND (
      public.is_system_owner()
      OR public.is_org_admin((storage.foldername(name))[1]::uuid)
    )
  );

DROP POLICY IF EXISTS "org_admin_manage_evidence" ON storage.objects;
CREATE POLICY "org_admin_manage_evidence" ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'mp-evidence'
    AND (
      public.is_system_owner()
      OR public.is_org_admin((SELECT organisation_id FROM mp_programs pr WHERE pr.id::text = (storage.foldername(name))[1]))
    )
  );
