-- Migration to fix Supervisor access to Program Calendar data
-- This ensures supervisors can view all meetings, pairs, and profiles regardless of participation

DO $$
BEGIN
  -- 1. Meetings: Supervisors manage everything
  DROP POLICY IF EXISTS "Supervisors can manage all meetings" ON mp_meetings;
  CREATE POLICY "Supervisors can manage all meetings"
    ON mp_meetings FOR ALL 
    TO authenticated
    USING (mp_get_my_role() = 'supervisor')
    WITH CHECK (mp_get_my_role() = 'supervisor');

  -- 2. Pairs: Supervisors see everything (needed for joins)
  DROP POLICY IF EXISTS "Supervisors can view all pairs" ON mp_pairs;
  CREATE POLICY "Supervisors can view all pairs"
    ON mp_pairs FOR SELECT
    TO authenticated
    USING (mp_get_my_role() = 'supervisor');

  -- 3. Profiles: Supervisors see everything (needed for names/avatars)
  DROP POLICY IF EXISTS "Supervisors can view all profiles" ON mp_profiles;
  CREATE POLICY "Supervisors can view all profiles"
    ON mp_profiles FOR SELECT
    TO authenticated
    USING (mp_get_my_role() = 'supervisor');

END $$;
