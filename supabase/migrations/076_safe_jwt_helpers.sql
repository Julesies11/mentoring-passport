-- Migration 076: Safe JWT Helpers
-- Ensures that empty strings in metadata don't cause UUID cast errors.

CREATE OR REPLACE FUNCTION public.active_org_id() RETURNS uuid AS $$
DECLARE
  v_id text;
BEGIN
  v_id := NULLIF(current_setting('request.jwt.claims', true)::json->'user_metadata'->>'active_org_id', '');
  IF v_id IS NULL THEN
    v_id := NULLIF(current_setting('request.jwt.claims', true)::json->'user_metadata'->>'selected_organisation_id', '');
  END IF;
  
  RETURN v_id::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION public.active_org_id() TO authenticated;
