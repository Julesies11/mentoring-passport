-- Migration 032: Add location and meeting_type to mp_meetings
-- Adds fields expected by the frontend interface

ALTER TABLE public.mp_meetings 
ADD COLUMN IF NOT EXISTS location TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS meeting_type TEXT DEFAULT 'virtual' CHECK (meeting_type IN ('in_person', 'virtual', 'phone'));
