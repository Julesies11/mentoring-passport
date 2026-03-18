-- Fix mp_get_my_role() function to work properly with RLS policies
-- The issue is that the function needs to properly access the JWT context

-- Drop existing function
DROP FUNCTION IF EXISTS mp_get_my_role();

-- Recreate with proper settings
CREATE OR REPLACE FUNCTION mp_get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role::text FROM mp_profiles WHERE id = auth.uid();
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION mp_get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION mp_get_my_role() TO anon;

-- Test the function (will still return NULL in SQL editor, but will work in API context)
-- To verify it works, check the policies can evaluate it
COMMENT ON FUNCTION mp_get_my_role() IS 'Returns the role of the currently authenticated user from mp_profiles. Returns NULL if user is not authenticated or profile does not exist.';
