-- Migration 075: Fix switch_active_org for Administrators
-- Redefines the RPC to use the stable mp_profiles role for admin verification
-- and ensures metadata doesn't lock out system owners.

CREATE OR REPLACE FUNCTION public.switch_active_org(new_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
  v_membership_role text;
  v_is_system_owner boolean;
  v_org_name text;
  v_raw_metadata jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Get the current metadata and the STABLE role from mp_profiles
  SELECT raw_user_meta_data INTO v_raw_metadata
  FROM auth.users
  WHERE id = v_user_id;

  SELECT (role = 'administrator') INTO v_is_system_owner
  FROM public.mp_profiles
  WHERE id = v_user_id;

  -- 2. Verify membership or admin status
  IF v_is_system_owner THEN
    v_membership_role := 'org-admin'; -- Admins masquerade as org-admins
  ELSE
    SELECT role INTO v_membership_role
    FROM mp_memberships
    WHERE user_id = v_user_id 
    AND organisation_id = new_org_id
    AND status = 'active';

    IF v_membership_role IS NULL THEN
      RAISE EXCEPTION 'User does not have an active membership in this organisation';
    END IF;
  END IF;

  -- 3. Get org name for metadata
  SELECT name INTO v_org_name FROM mp_organisations WHERE id = new_org_id;

  -- 4. Update the user's raw_user_meta_data
  -- We preserve the 'administrator' role if they are a system owner
  -- so that the NEXT call to this RPC (or other RPCs) still recognizes them.
  UPDATE auth.users
  SET raw_user_meta_data = 
    COALESCE(v_raw_metadata, '{}'::jsonb) || 
    jsonb_build_object(
      'active_org_id', new_org_id,
      'active_role', v_membership_role,
      'active_org_name', v_org_name,
      'is_system_owner', v_is_system_owner,
      'selected_organisation_id', new_org_id,
      'role', CASE WHEN v_is_system_owner THEN 'administrator' ELSE v_membership_role END
    )
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'active_org_id', new_org_id,
    'active_role', v_membership_role,
    'is_system_owner', v_is_system_owner
  );
END;
$$;
