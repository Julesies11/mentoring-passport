-- Migration 064: Broaden System Owner Check
-- Ensures that the system owner is correctly identified whether the flag
-- is 'role: administrator' or 'is_admin: true'.

CREATE OR REPLACE FUNCTION public.is_system_owner() RETURNS boolean AS $$
DECLARE
  v_claims jsonb;
BEGIN
  v_claims := current_setting('request.jwt.claims', true)::jsonb;
  
  RETURN (
    -- 1. Explicit flag set by switch_active_org
    COALESCE((v_claims->'user_metadata'->>'is_system_owner')::boolean, false)
    OR 
    -- 2. role: 'administrator'
    (v_claims->'user_metadata'->>'role' = 'administrator')
    OR
    -- 3. top-level role
    (v_claims->>'role' = 'administrator')
    OR
    -- 4. legacy is_admin flag
    COALESCE((v_claims->'user_metadata'->>'is_admin')::boolean, false)
  );
END;
$$ LANGUAGE plpgsql STABLE;
