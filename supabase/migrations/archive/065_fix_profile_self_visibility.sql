-- Migration 065: Fix Profile Self-Visibility RLS
-- Allows users to always view their own profile, even before an active
-- organisation context is selected. This fixes the "Profile not found" 
-- error during the initial login flow for program members.

DROP POLICY IF EXISTS "jwt_profile_view" ON mp_profiles;

CREATE POLICY "jwt_profile_view" ON mp_profiles FOR SELECT TO authenticated 
  USING (
    id = auth.uid() 
    OR public.is_system_owner() 
    OR organisation_id = public.active_org_id()
  );

-- Also ensure users can see their own memberships (already exists but good to verify)
DROP POLICY IF EXISTS "jwt_membership_self_view" ON mp_memberships;
CREATE POLICY "jwt_membership_self_view" ON mp_memberships FOR SELECT TO authenticated 
  USING (user_id = auth.uid());
