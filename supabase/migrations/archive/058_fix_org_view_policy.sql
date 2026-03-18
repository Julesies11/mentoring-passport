-- Migration 058: Fix organisation view policy for members

-- Ensure all members of an organisation can view its basic details
-- This fixes the 406 Not Acceptable error for Supervisors and Program Members
DROP POLICY IF EXISTS "member_view_own_org" ON public.mp_organisations;
CREATE POLICY "member_view_own_org" ON public.mp_organisations FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.mp_memberships WHERE user_id = auth.uid() AND organisation_id = id));
