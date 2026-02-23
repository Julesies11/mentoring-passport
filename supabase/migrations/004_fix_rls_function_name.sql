-- Fix RLS helper function name inconsistency
-- The function was created as mp_mp_get_my_role() but policies reference mp_get_my_role()

-- Drop the incorrectly named function
DROP FUNCTION IF EXISTS mp_mp_get_my_role();

-- Create the function with the correct name
CREATE OR REPLACE FUNCTION mp_get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM mp_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION mp_get_my_role() TO authenticated;
