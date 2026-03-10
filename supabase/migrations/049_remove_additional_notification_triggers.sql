-- Migration to remove additional legacy notification triggers
-- We are moving all notification logic to the application code for better testability and control

-- 1. Drop Triggers
DROP TRIGGER IF EXISTS mp_on_meeting_created ON mp_meetings;
DROP TRIGGER IF EXISTS mp_on_task_completed ON mp_pair_tasks;

-- 2. Drop the associated notification functions
DROP FUNCTION IF EXISTS mp_notify_meeting_created() CASCADE;
DROP FUNCTION IF EXISTS mp_notify_task_completed() CASCADE;
