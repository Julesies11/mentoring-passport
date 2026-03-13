-- Migration 063: Fix Organisation Visibility for Selection Screen
-- Allows users to view organisations they are a member of, even before
-- they have selected an 'active' organisation context. This is necessary
-- to populate the cards on the /auth/select-organisation screen.

DROP POLICY IF EXISTS "jwt_org_view" ON mp_organisations;

CREATE POLICY "jwt_org_view" ON mp_organisations FOR SELECT TO authenticated 
  USING (
    public.is_system_owner() 
    OR id = public.active_org_id()
    -- Allow viewing if they have a membership (required for the selection screen)
    OR EXISTS (SELECT 1 FROM mp_memberships WHERE user_id = auth.uid() AND organisation_id = mp_organisations.id)
  );
