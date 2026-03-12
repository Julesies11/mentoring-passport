-- Migration 056: Fix relationship between mp_profiles and mp_memberships
-- PostgREST requires an explicit foreign key to join tables in a select query.

-- 1. Add foreign key from mp_memberships to mp_profiles
-- Even though user_id already references auth.users, adding this explicit reference 
-- to mp_profiles allows PostgREST to "see" the join path.
ALTER TABLE public.mp_memberships
DROP CONSTRAINT IF EXISTS mp_memberships_user_id_profiles_fkey,
ADD CONSTRAINT mp_memberships_user_id_profiles_fkey 
FOREIGN KEY (user_id) REFERENCES public.mp_profiles(id) ON DELETE CASCADE;

-- 2. Do the same for mp_supervisor_programs to allow similar joins if needed
ALTER TABLE public.mp_supervisor_programs
DROP CONSTRAINT IF EXISTS mp_supervisor_programs_user_id_profiles_fkey,
ADD CONSTRAINT mp_supervisor_programs_user_id_profiles_fkey 
FOREIGN KEY (user_id) REFERENCES public.mp_profiles(id) ON DELETE CASCADE;
