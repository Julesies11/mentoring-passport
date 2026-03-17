-- Migration 071: Enforce Memberships for all non-admins (Fixed)
-- This migration ensures that every user (except System Owners) with an organisation_id
-- in their profile has a corresponding entry in mp_memberships.

-- 1. Backfill missing memberships from existing mp_profiles
-- We join with auth.users to get the role from metadata since it was removed from mp_profiles.
INSERT INTO public.mp_memberships (user_id, organisation_id, role, status)
SELECT 
    p.id as user_id, 
    p.organisation_id, 
    CASE 
        WHEN COALESCE(u.raw_user_meta_data->>'role', 'program-member') = 'supervisor' THEN 'supervisor'::public.mp_membership_role
        ELSE 'program-member'::public.mp_membership_role 
    END as role,
    p.status
FROM public.mp_profiles p
JOIN auth.users u ON p.id = u.id
LEFT JOIN public.mp_memberships m ON p.id = m.user_id AND p.organisation_id = m.organisation_id
WHERE p.organisation_id IS NOT NULL 
AND m.id IS NULL
AND COALESCE(u.raw_user_meta_data->>'role', '') != 'administrator'
AND COALESCE((u.raw_user_meta_data->>'is_admin')::boolean, false) = false
ON CONFLICT (user_id, organisation_id) DO NOTHING;

-- 2. Create a trigger function to automatically sync memberships from profiles
-- This ensures that if organisation_id is set or changed on a profile, 
-- a membership is automatically created or updated.
CREATE OR REPLACE FUNCTION public.mp_sync_profile_to_membership()
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT;
    v_is_admin BOOLEAN;
BEGIN
    -- Get role and admin status from auth.users metadata
    SELECT 
        COALESCE(raw_user_meta_data->>'role', 'program-member'),
        COALESCE((raw_user_meta_data->>'is_admin')::boolean, false) OR (raw_user_meta_data->>'role' = 'administrator')
    INTO v_role, v_is_admin
    FROM auth.users
    WHERE id = NEW.id;

    -- Only for non-admins
    IF v_is_admin THEN
        RETURN NEW;
    END IF;

    -- If organisation_id is set, ensure a membership exists
    IF NEW.organisation_id IS NOT NULL THEN
        INSERT INTO public.mp_memberships (user_id, organisation_id, role, status)
        VALUES (
            NEW.id,
            NEW.organisation_id,
            CASE 
                WHEN v_role = 'supervisor' THEN 'supervisor'::public.mp_membership_role
                ELSE 'program-member'::public.mp_membership_role 
            END,
            NEW.status
        )
        ON CONFLICT (user_id, organisation_id) DO UPDATE SET
            role = EXCLUDED.role,
            status = EXCLUDED.status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Apply the trigger to mp_profiles
DROP TRIGGER IF EXISTS tr_mp_sync_profile_to_membership ON public.mp_profiles;
CREATE TRIGGER tr_mp_sync_profile_to_membership
AFTER INSERT OR UPDATE OF organisation_id, status ON public.mp_profiles
FOR EACH ROW
EXECUTE FUNCTION public.mp_sync_profile_to_membership();

-- 4. Update the handle_new_user function to be more robust
-- This matches the standard established in migration 057 but with better metadata handling.
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
