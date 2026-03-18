-- Migration to remove all notification triggers
-- We are moving notification logic to the application code for better testability

-- 1. Drop Triggers from all potential tables (covering both mp_evidence and mp_evidence_uploads)
DROP TRIGGER IF EXISTS mp_on_evidence_uploaded ON mp_evidence;
DROP TRIGGER IF EXISTS mp_on_evidence_reviewed ON mp_evidence;
DROP TRIGGER IF EXISTS mp_on_evidence_uploaded ON mp_evidence_uploads;
DROP TRIGGER IF EXISTS mp_on_evidence_reviewed ON mp_evidence_uploads;
DROP TRIGGER IF EXISTS mp_on_meeting_changes ON mp_meetings;
DROP TRIGGER IF EXISTS mp_on_task_added ON mp_pair_tasks;
DROP TRIGGER IF EXISTS mp_on_task_status_change ON mp_pair_tasks;
DROP TRIGGER IF EXISTS mp_on_task_milestone ON mp_pair_tasks;
DROP TRIGGER IF EXISTS mp_on_pair_created_notify ON mp_pairs;
DROP TRIGGER IF EXISTS mp_on_profile_completed ON mp_profiles;

-- 2. Drop the redundant notification functions
DROP FUNCTION IF EXISTS mp_notify_evidence_uploaded() CASCADE;
DROP FUNCTION IF EXISTS mp_notify_evidence_reviewed() CASCADE;
DROP FUNCTION IF EXISTS mp_notify_meeting_changes() CASCADE;
DROP FUNCTION IF EXISTS mp_notify_task_added() CASCADE;
DROP FUNCTION IF EXISTS mp_notify_task_status_change() CASCADE;
DROP FUNCTION IF EXISTS mp_notify_task_milestones() CASCADE;
DROP FUNCTION IF EXISTS mp_notify_pair_created() CASCADE;
DROP FUNCTION IF EXISTS mp_notify_profile_completed() CASCADE;

-- 3. Update RLS for mp_notifications
-- Allow users to create notifications for others
-- This is necessary since the app now sends the "pings"
DROP POLICY IF EXISTS "Users can insert their own notifications" ON mp_notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON mp_notifications;

CREATE POLICY "Users can insert notifications" ON mp_notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
