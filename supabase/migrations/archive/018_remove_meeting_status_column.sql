-- Migration to remove the 'status' column from mp_meetings
-- Status is now calculated dynamically in the application layer

-- 1. Drop the check constraint that depends on the column
ALTER TABLE public.mp_meetings DROP CONSTRAINT IF EXISTS mp_meetings_status_check;

-- 2. Remove the status column
ALTER TABLE public.mp_meetings DROP COLUMN IF EXISTS status;
