-- Migration: Comprehensive Meetings Schema Reconciliation (Fixed Order)
-- Description: Aligns the mp_meetings table with the React application's Meeting interface and constants.
-- This version drops constraints BEFORE updating data to prevent "check constraint" violations.

-- 1. DROP OLD CONSTRAINTS FIRST
ALTER TABLE public.mp_meetings DROP CONSTRAINT IF EXISTS mp_meetings_meeting_type_check;
ALTER TABLE public.mp_meetings DROP CONSTRAINT IF EXISTS mp_meetings_location_type_check;
ALTER TABLE public.mp_meetings DROP CONSTRAINT IF EXISTS mp_meetings_status_check;

DO $$ 
BEGIN
    -- 2. Handle location_type / meeting_type naming
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mp_meetings' AND column_name = 'meeting_type') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mp_meetings' AND column_name = 'location_type') THEN
        ALTER TABLE public.mp_meetings RENAME COLUMN meeting_type TO location_type;
    END IF;

    -- 3. Ensure location_type exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mp_meetings' AND column_name = 'location_type') THEN
        ALTER TABLE public.mp_meetings ADD COLUMN location_type TEXT DEFAULT 'video';
    END IF;

    -- 4. Add status column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mp_meetings' AND column_name = 'status') THEN
        ALTER TABLE public.mp_meetings ADD COLUMN status TEXT DEFAULT 'upcoming';
    END IF;

    -- 5. Ensure duration_minutes is present
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mp_meetings' AND column_name = 'duration_minutes') THEN
        ALTER TABLE public.mp_meetings ADD COLUMN duration_minutes INTEGER DEFAULT 60;
    END IF;

    -- 6. Ensure location and location_details are present
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mp_meetings' AND column_name = 'location') THEN
        ALTER TABLE public.mp_meetings ADD COLUMN location TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mp_meetings' AND column_name = 'location_details') THEN
        ALTER TABLE public.mp_meetings ADD COLUMN location_details TEXT;
    END IF;
END $$;

-- 7. RE-MAP VALUES (Now safe because constraints are gone)
UPDATE public.mp_meetings SET location_type = 'in-person' WHERE location_type = 'in_person';
UPDATE public.mp_meetings SET location_type = 'video' WHERE location_type = 'virtual';
-- Ensure no nulls in status
UPDATE public.mp_meetings SET status = 'upcoming' WHERE status IS NULL;

-- 8. ADD NEW CONSTRAINTS
ALTER TABLE public.mp_meetings ADD CONSTRAINT mp_meetings_location_type_check 
CHECK (location_type IN ('in-person', 'video', 'phone', 'other'));

ALTER TABLE public.mp_meetings ADD CONSTRAINT mp_meetings_status_check 
CHECK (status IN ('upcoming', 'completed', 'cancelled'));

-- 9. Final Clean-up: Set non-null and defaults
ALTER TABLE public.mp_meetings ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.mp_meetings ALTER COLUMN status SET DEFAULT 'upcoming';
ALTER TABLE public.mp_meetings ALTER COLUMN location_type SET DEFAULT 'video';

-- 10. REFRESH RLS POLICIES (Make them program-scoped for supervisors)
DROP POLICY IF EXISTS "meeting_view" ON public.mp_meetings;
DROP POLICY IF EXISTS "meeting_all" ON public.mp_meetings;

-- View Policy: 
-- 1. Sys Admins / Org Admins see everything.
-- 2. Supervisors see meetings in their assigned programs.
-- 3. Pair members see their own meetings.
CREATE POLICY "meeting_view_v2" ON public.mp_meetings FOR SELECT TO authenticated 
  USING (
    public.is_sys_admin() 
    OR public.is_org_admin() 
    OR public.is_supervisor(program_id)
    OR public.is_pair_member(pair_id)
  );

-- All Operations (Insert/Update/Delete) Policy:
-- Same logic: Admins + Assigned Supervisors + Pair Members.
CREATE POLICY "meeting_manage_v2" ON public.mp_meetings FOR ALL TO authenticated 
  USING (
    public.is_sys_admin() 
    OR public.is_org_admin() 
    OR public.is_supervisor(program_id)
    OR public.is_pair_member(pair_id)
  );
