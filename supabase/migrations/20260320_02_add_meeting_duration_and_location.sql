-- Migration: Add duration and location details to mp_meetings
-- Description: Adds columns to track meeting length and specific location details (like links or room numbers).

ALTER TABLE public.mp_meetings 
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS location_details TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.mp_meetings.duration_minutes IS 'The planned duration of the meeting in minutes (default 60).';
COMMENT ON COLUMN public.mp_meetings.location_details IS 'Specific location details, such as a video call link or room number.';
