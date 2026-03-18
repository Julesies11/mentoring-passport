-- Migration 073: Automatic Context Priming
-- Automatically sets the default organisation for a user when they get their first membership.

CREATE OR REPLACE FUNCTION public.handle_new_membership()
RETURNS TRIGGER AS $$
DECLARE
  v_count int;
  v_is_admin boolean;
BEGIN
  -- 1. Check if this is the user's first active membership
  SELECT count(*) INTO v_count 
  FROM public.mp_memberships 
  WHERE user_id = NEW.user_id AND status = 'active';

  -- 2. If it's the first one, sync it to the mp_profiles table for instant RLS access
  IF v_count = 1 THEN
    UPDATE public.mp_profiles 
    SET organisation_id = NEW.organisation_id
    WHERE id = NEW.user_id AND organisation_id IS NULL;

    -- 3. Also update auth.users metadata so the NEXT login is perfect
    -- We use SECURITY DEFINER to allow updating auth.users
    SELECT (role = 'administrator') INTO v_is_admin FROM public.mp_profiles WHERE id = NEW.user_id;
    
    UPDATE auth.users
    SET raw_user_meta_data = 
      COALESCE(raw_user_meta_data, '{}'::jsonb) || 
      jsonb_build_object(
        'active_org_id', NEW.organisation_id,
        'selected_organisation_id', NEW.organisation_id,
        'active_role', NEW.role,
        'role', NEW.role,
        'is_system_owner', COALESCE(v_is_admin, false)
      )
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_membership_created ON public.mp_memberships;
CREATE TRIGGER on_membership_created
  AFTER INSERT OR UPDATE OF status ON public.mp_memberships
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION public.handle_new_membership();
