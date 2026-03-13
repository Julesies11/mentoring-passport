-- Migration 061: Fix System Owner Check
-- This ensures Administrators are recognized immediately after login,
-- even before the 'active_org_id' is set in their metadata.

CREATE OR REPLACE FUNCTION public.is_system_owner() RETURNS boolean AS $$
DECLARE
  v_claims jsonb;
BEGIN
  v_claims := current_setting('request.jwt.claims', true)::jsonb;
  
  RETURN (
    -- 1. Check for explicit flag set by switch_active_org
    COALESCE((v_claims->'user_metadata'->>'is_system_owner')::boolean, false)
    OR 
    -- 2. Check for the 'role' field in user_metadata (set during signup/admin creation)
    (v_claims->'user_metadata'->>'role' = 'administrator')
    OR
    -- 3. Check for the top-level JWT role (if Supabase is configured to inject it there)
    (v_claims->>'role' = 'administrator')
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Redefine active_role to be more resilient
CREATE OR REPLACE FUNCTION public.active_role() RETURNS text AS $$
BEGIN
  RETURN (
    COALESCE(
      current_setting('request.jwt.claims', true)::jsonb->'user_metadata'->>'active_role',
      current_setting('request.jwt.claims', true)::jsonb->'user_metadata'->>'role',
      'none'
    )
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Ensure privileged check is updated
CREATE OR REPLACE FUNCTION public.is_privileged() RETURNS boolean AS $$
  SELECT public.is_system_owner() OR public.active_role() IN ('org-admin', 'supervisor');
$$ LANGUAGE SQL STABLE;
