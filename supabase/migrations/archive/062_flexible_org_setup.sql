-- Migration 062: Flexible Organisation Setup
-- This version allows administrators to setup a new organisation and assign an ORG-ADMIN
-- either by creating a new user or by selecting an existing user from the system.

CREATE OR REPLACE FUNCTION public.mp_admin_setup_organisation_v2(
  org_name TEXT,
  org_logo_url TEXT DEFAULT NULL,
  admin_mode TEXT DEFAULT 'new', -- 'new' or 'existing'
  admin_user_id UUID DEFAULT NULL,
  admin_name TEXT DEFAULT NULL,
  admin_email TEXT DEFAULT NULL,
  admin_password TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  new_org_id UUID;
  new_admin_id UUID;
BEGIN
  -- 1. Verify caller is administrator
  IF NOT (SELECT public.is_system_owner()) THEN
    RAISE EXCEPTION 'Only administrators can perform this action';
  END IF;

  -- 2. Create the Organisation
  INSERT INTO public.mp_organisations (name, logo_url)
  VALUES (org_name, org_logo_url)
  RETURNING id INTO new_org_id;

  -- 3. Assign Org Admin
  IF admin_mode = 'existing' THEN
    IF admin_user_id IS NULL THEN
      RAISE EXCEPTION 'admin_user_id is required for existing user mode';
    END IF;

    -- Verify user exists
    IF NOT EXISTS (SELECT 1 FROM public.mp_profiles WHERE id = admin_user_id) THEN
      RAISE EXCEPTION 'User not found';
    END IF;

    -- Add membership to the new organisation with 'org-admin' role
    INSERT INTO public.mp_memberships (user_id, organisation_id, role, status)
    VALUES (admin_user_id, new_org_id, 'org-admin', 'active')
    ON CONFLICT (user_id, organisation_id) DO UPDATE SET role = 'org-admin', status = 'active';

  ELSE -- 'new' user mode
    IF admin_email IS NULL OR admin_password IS NULL OR admin_name IS NULL THEN
      RAISE EXCEPTION 'Admin email, name and password are required for new user mode';
    END IF;

    -- Call existing creation helper to handle auth.users and profile
    new_admin_id := public.mp_admin_create_user(
      admin_email,
      admin_password,
      admin_name,
      'org-admin',
      new_org_id
    );

    -- Create membership record (create_user helper doesn't do this)
    INSERT INTO public.mp_memberships (user_id, organisation_id, role, status)
    VALUES (new_admin_id, new_org_id, 'org-admin', 'active');
  END IF;

  RETURN new_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mp_admin_setup_organisation_v2 TO authenticated;
