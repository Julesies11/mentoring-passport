-- Migration 074: Hybrid RLS Policies
-- Strengthens RLS policies to work even if the JWT is missing metadata.
-- Use direct table subqueries as fallbacks to ensure zero data invisibility.

-- --- mp_profiles ---
DROP POLICY IF EXISTS "jwt_profile_view" ON mp_profiles;
CREATE POLICY "jwt_profile_view" ON mp_profiles FOR SELECT TO authenticated 
  USING (
    public.is_system_owner() 
    OR id = auth.uid() -- Always see self
    OR organisation_id = public.active_org_id() -- Fast path
    OR organisation_id IN (SELECT organisation_id FROM mp_memberships WHERE user_id = auth.uid()) -- Fallback path
  );

-- --- mp_memberships ---
DROP POLICY IF EXISTS "jwt_membership_self_view" ON mp_memberships;
CREATE POLICY "jwt_membership_self_view" ON mp_memberships FOR SELECT TO authenticated 
  USING (user_id = auth.uid()); -- No recursion, direct check

-- --- mp_organisations ---
DROP POLICY IF EXISTS "jwt_org_view" ON mp_organisations;
CREATE POLICY "jwt_org_view" ON mp_organisations FOR SELECT TO authenticated 
  USING (
    public.is_system_owner() 
    OR id = public.active_org_id() 
    OR id IN (SELECT organisation_id FROM mp_memberships WHERE user_id = auth.uid()) -- Fallback
  );

-- --- mp_programs ---
DROP POLICY IF EXISTS "jwt_program_view" ON mp_programs;
CREATE POLICY "jwt_program_view" ON mp_programs FOR SELECT TO authenticated 
  USING (
    public.is_system_owner() 
    OR organisation_id = public.active_org_id()
    OR organisation_id IN (SELECT organisation_id FROM mp_memberships WHERE user_id = auth.uid()) -- Fallback
  );

-- --- mp_pairs ---
DROP POLICY IF EXISTS "jwt_pair_view" ON mp_pairs;
CREATE POLICY "jwt_pair_view" ON mp_pairs FOR SELECT TO authenticated 
  USING (
    public.is_system_owner() 
    OR organisation_id = public.active_org_id()
    OR mentor_id = auth.uid()
    OR mentee_id = auth.uid()
    OR organisation_id IN (SELECT organisation_id FROM mp_memberships WHERE user_id = auth.uid()) -- Fallback
  );
