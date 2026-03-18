-- Migration 072 (REPAIR v3): Bulletproof non-recursive helpers
-- This version removes ALL database queries from the helper functions.

-- 1. active_org_id: 100% JWT based
CREATE OR REPLACE FUNCTION public.active_org_id() RETURNS uuid AS $$
  SELECT (NULLIF(current_setting('request.jwt.claims', true)::json->'user_metadata'->>'active_org_id', 
         NULLIF(current_setting('request.jwt.claims', true)::json->'user_metadata'->>'selected_organisation_id', '')))::uuid;
$$ LANGUAGE SQL STABLE;

-- 2. active_role: 100% JWT based
CREATE OR REPLACE FUNCTION public.active_role() RETURNS text AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->'user_metadata'->>'active_role',
    current_setting('request.jwt.claims', true)::json->'user_metadata'->>'role'
  )::text;
$$ LANGUAGE SQL STABLE;

-- 3. is_system_owner: 100% JWT based (Safe from recursion)
CREATE OR REPLACE FUNCTION public.is_system_owner() RETURNS boolean AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->'user_metadata'->>'is_system_owner')::boolean,
    current_setting('request.jwt.claims', true)::json->'user_metadata'->>'role' = 'administrator'
  );
$$ LANGUAGE SQL STABLE;

-- 4. Re-grant permissions
GRANT EXECUTE ON FUNCTION public.active_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.active_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_system_owner() TO authenticated;

-- 5. EMERGENCY: Open profiles/memberships for self-view (Critical for Auth flow)
DROP POLICY IF EXISTS "jwt_profile_self_view" ON mp_profiles;
CREATE POLICY "jwt_profile_self_view" ON mp_profiles FOR SELECT TO authenticated 
  USING (id = auth.uid());

DROP POLICY IF EXISTS "jwt_membership_self_view" ON mp_memberships;
CREATE POLICY "jwt_membership_self_view" ON mp_memberships FOR SELECT TO authenticated 
  USING (user_id = auth.uid());
