-- Consolidated Unified Notification System (Gold Standard) - STRICT NO UPLOAD SPAM
-- Combines Actionable Triggers, Supervisor Oversight, and Relationship Sync

-- ============================================================================
-- 1. HELPER FUNCTIONS
-- ============================================================================

-- Primary function to create a notification
CREATE OR REPLACE FUNCTION mp_create_notification(
  p_recipient_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_description TEXT,
  p_action_url TEXT DEFAULT NULL,
  p_related_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO mp_notifications (
    recipient_id,
    type,
    title,
    description,
    action_url,
    related_id
  ) VALUES (
    p_recipient_id,
    p_type,
    p_title,
    p_description,
    p_action_url,
    p_related_id
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for pair stagnation (intended for CRON/Edge Function)
CREATE OR REPLACE FUNCTION mp_check_stagnation()
RETURNS void AS $$
DECLARE
  v_pair RECORD;
  v_supervisor RECORD;
  v_last_activity TIMESTAMPTZ;
BEGIN
  FOR v_pair IN 
    SELECT p.id, p.mentor_id, p.mentee_id, m.full_name as mentor_name, me.full_name as mentee_name
    FROM mp_pairs p
    JOIN mp_profiles m ON m.id = p.mentor_id
    JOIN mp_profiles me ON me.id = p.mentee_id
    WHERE p.status = 'active'
  LOOP
    -- Get last activity from evidence uploads, meetings, or task completion
    SELECT max(activity_date) INTO v_last_activity
    FROM (
      SELECT created_at as activity_date FROM mp_evidence_uploads WHERE pair_id = v_pair.id
      UNION ALL
      SELECT created_at FROM mp_meetings WHERE pair_id = v_pair.id
      UNION ALL
      SELECT updated_at FROM mp_pair_tasks WHERE pair_id = v_pair.id AND status = 'completed'
    ) AS activity;

    -- If no activity for 14 days
    IF (v_last_activity IS NULL AND EXISTS (SELECT 1 FROM mp_pairs WHERE id = v_pair.id AND created_at < now() - interval '14 days'))
       OR (v_last_activity < now() - interval '14 days') THEN
       
      FOR v_supervisor IN (SELECT id FROM mp_profiles WHERE role = 'supervisor') LOOP
        -- Avoid spam: check if notified in last 7 days
        IF NOT EXISTS (
          SELECT 1 FROM mp_notifications 
          WHERE recipient_id = v_supervisor.id 
            AND type = 'stagnation_alert' 
            AND related_id = v_pair.id 
            AND created_at > now() - interval '7 days'
        ) THEN
          PERFORM mp_create_notification(
            v_supervisor.id,
            'stagnation_alert',
            'Stagnation Alert',
            'Pair ' || v_pair.mentor_name || ' and ' || v_pair.mentee_name || ' has had no activity for 14 days.',
            '/supervisor/pairs?pairId=' || v_pair.id,
            v_pair.id
          );
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. EVIDENCE TRIGGERS (Partner Only, NEVER Supervisor)
-- ============================================================================

-- Handles New Uploads (NOTIFIES PARTNER ONLY, DEFINITIVELY NO SUPERVISOR)
CREATE OR REPLACE FUNCTION mp_notify_evidence_uploaded()
RETURNS TRIGGER AS $$
DECLARE
  v_pair RECORD;
  v_task_name TEXT;
  v_submitter_name TEXT;
BEGIN
  -- Get pair information and names
  SELECT p.mentor_id, p.mentee_id, m.full_name as mentor_name, me.full_name as mentee_name
  INTO v_pair
  FROM mp_pairs p
  JOIN mp_profiles m ON m.id = p.mentor_id
  JOIN mp_profiles me ON me.id = p.mentee_id
  WHERE p.id = NEW.pair_id;
  
  IF NEW.pair_task_id IS NOT NULL THEN
    SELECT name INTO v_task_name FROM mp_pair_tasks WHERE id = NEW.pair_task_id;
  END IF;
  
  SELECT full_name INTO v_submitter_name FROM mp_profiles WHERE id = NEW.submitted_by;
  
  -- Notify the OTHER person in the pair ONLY (Mentor/Mentee relationship pulse)
  -- Supervisor is 100% excluded from this notification path.
  IF NEW.submitted_by = v_pair.mentor_id THEN
    PERFORM mp_create_notification(
      v_pair.mentee_id, 'evidence_uploaded', 'Partner Uploaded Evidence',
      v_submitter_name || ' uploaded evidence' || COALESCE(' for: ' || v_task_name, ''),
      '/program-member/tasks?id=' || NEW.id, NEW.id
    );
  ELSIF NEW.submitted_by = v_pair.mentee_id THEN
    PERFORM mp_create_notification(
      v_pair.mentor_id, 'evidence_uploaded', 'Partner Submitted Evidence',
      v_submitter_name || ' shared evidence' || COALESCE(' for: ' || v_task_name, ''),
      '/program-member/tasks?id=' || NEW.id, NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Handles Evidence Review Outcomes (Only 1 notification with status + note)
CREATE OR REPLACE FUNCTION mp_notify_evidence_reviewed()
RETURNS TRIGGER AS $$
DECLARE
  v_pair RECORD;
  v_task_name TEXT;
  v_rejection_reason TEXT;
  v_status_label TEXT;
BEGIN
  -- Only trigger when status changes from pending to approved or rejected
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    -- Get pair information and names
    SELECT p.mentor_id, p.mentee_id, m.full_name as mentor_name, me.full_name as mentee_name
    INTO v_pair FROM mp_pairs p
    JOIN mp_profiles m ON m.id = p.mentor_id
    JOIN mp_profiles me ON me.id = p.mentee_id
    WHERE p.id = NEW.pair_id;
    
    -- Get task details including name and rejection reason (stored on pair_tasks)
    IF NEW.pair_task_id IS NOT NULL THEN
      SELECT name, rejection_reason INTO v_task_name, v_rejection_reason 
      FROM mp_pair_tasks WHERE id = NEW.pair_task_id;
    END IF;

    v_status_label := CASE WHEN NEW.status = 'approved' THEN 'Approved' ELSE 'Revision Requested' END;

    -- A. Notify Submitter (Include the note if it's a rejection)
    PERFORM mp_create_notification(
      NEW.submitted_by,
      CASE WHEN NEW.status = 'approved' THEN 'evidence_approved' ELSE 'evidence_rejected' END,
      'Evidence ' || v_status_label,
      CASE 
        WHEN NEW.status = 'approved' THEN 'Your evidence' || COALESCE(' for ' || v_task_name, '') || ' has been approved by the Supervisor.'
        ELSE 'Revision requested on ' || COALESCE(v_task_name, 'your evidence') || '. Feedback: ' || COALESCE(v_rejection_reason, 'Please check details.')
      END,
      '/program-member/tasks?id=' || NEW.id, NEW.id
    );

    -- B. Notify Partner
    IF NEW.submitted_by = v_pair.mentor_id THEN
      PERFORM mp_create_notification(
        v_pair.mentee_id, 
        CASE WHEN NEW.status = 'approved' THEN 'evidence_approved' ELSE 'evidence_rejected' END,
        'Pair Progress: Evidence ' || v_status_label,
        CASE 
          WHEN NEW.status = 'approved' THEN 'The Supervisor approved the evidence uploaded by ' || v_pair.mentor_name || '.'
          ELSE 'Revision requested on evidence by ' || v_pair.mentor_name || '. Feedback: ' || COALESCE(v_rejection_reason, 'Check details.')
        END,
        '/program-member/tasks?id=' || NEW.id, NEW.id
      );
    ELSE
      PERFORM mp_create_notification(
        v_pair.mentor_id, 
        CASE WHEN NEW.status = 'approved' THEN 'evidence_approved' ELSE 'evidence_rejected' END,
        'Pair Progress: Evidence ' || v_status_label,
        CASE 
          WHEN NEW.status = 'approved' THEN 'The Supervisor approved the evidence uploaded by ' || v_pair.mentee_name || '.'
          ELSE 'Revision requested on evidence by ' || v_pair.mentee_name || '. Feedback: ' || COALESCE(v_rejection_reason, 'Check details.')
        END,
        '/program-member/tasks?id=' || NEW.id, NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. MEETING TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION mp_notify_meeting_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_pair RECORD;
  v_is_new BOOLEAN;
BEGIN
  v_is_new := (TG_OP = 'INSERT');
  SELECT mentor_id, mentee_id INTO v_pair FROM mp_pairs WHERE id = NEW.pair_id;

  PERFORM mp_create_notification(
    v_pair.mentor_id,
    CASE WHEN v_is_new THEN 'meeting_created' ELSE 'meeting_updated' END,
    CASE WHEN v_is_new THEN 'New Meeting Scheduled' ELSE 'Meeting Details Updated' END,
    'Meeting: ' || NEW.title || ' on ' || TO_CHAR(NEW.date_time, 'DD Mon YYYY at HH24:MI'),
    '/program-member/meetings?id=' || NEW.id, NEW.id
  );
  
  PERFORM mp_create_notification(
    v_pair.mentee_id,
    CASE WHEN v_is_new THEN 'meeting_created' ELSE 'meeting_updated' END,
    CASE WHEN v_is_new THEN 'New Meeting Scheduled' ELSE 'Meeting Details Updated' END,
    'Meeting: ' || NEW.title || ' on ' || TO_CHAR(NEW.date_time, 'DD Mon YYYY at HH24:MI'),
    '/program-member/meetings?id=' || NEW.id, NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. PAIR & TASK TRIGGERS (Milestones, Progress, Submissions)
-- ============================================================================

-- Handles Task Status Changes (Submissions & Completions)
CREATE OR REPLACE FUNCTION mp_notify_task_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_pair RECORD;
  v_supervisor RECORD;
BEGIN
  -- Get pair names
  SELECT m.full_name as mentor_name, me.full_name as mentee_name
  INTO v_pair
  FROM mp_pairs p
  JOIN mp_profiles m ON m.id = p.mentor_id
  JOIN mp_profiles me ON me.id = p.mentee_id
  WHERE p.id = NEW.pair_id;

  -- 1. TASK SUBMITTED FOR REVIEW (Notify Supervisor)
  -- This is THE ONLY POINT the supervisor gets notified about work
  IF (OLD.status IS DISTINCT FROM NEW.status) AND NEW.status = 'awaiting_review' THEN
    FOR v_supervisor IN (SELECT id FROM mp_profiles WHERE role = 'supervisor') LOOP
      PERFORM mp_create_notification(
        v_supervisor.id, 
        'task_completed', -- Use task icon to distinguish from "upload"
        'Task Awaiting Review',
        v_pair.mentor_name || ' (Mentor) and ' || v_pair.mentee_name || ' (Mentee) submitted ' || NEW.name || ' for your review.',
        '/supervisor/evidence-review?pairId=' || NEW.pair_id, 
        NEW.pair_id
      );
    END LOOP;
  END IF;

  -- 2. TASK COMPLETED (Notify Mentor/Mentee)
  IF (OLD.status IS DISTINCT FROM NEW.status) AND NEW.status = 'completed' THEN
    SELECT mentor_id, mentee_id INTO v_pair FROM mp_pairs WHERE id = NEW.pair_id;
    
    PERFORM mp_create_notification(v_pair.mentor_id, 'task_completed', 'Task Completed', 'Task completed: ' || NEW.name, '/program-member/tasks?taskId=' || NEW.id, NEW.id);
    PERFORM mp_create_notification(v_pair.mentee_id, 'task_completed', 'Task Completed', 'Task completed: ' || NEW.name, '/program-member/tasks?taskId=' || NEW.id, NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Handles New Task Additions to existing active pairs (Supervisor adds a task)
CREATE OR REPLACE FUNCTION mp_notify_task_added()
RETURNS TRIGGER AS $$
DECLARE
  v_pair RECORD;
  v_has_started BOOLEAN;
BEGIN
  -- Get pair information and status
  SELECT id, mentor_id, mentee_id, status, created_at INTO v_pair
  FROM mp_pairs
  WHERE id = NEW.pair_id;

  -- Only notify if: Pair is active and was NOT just created
  IF v_pair.status = 'active' AND v_pair.created_at < now() - interval '1 minute' THEN
    
    -- Check if they have already started working (at least one task is awaiting review or completed)
    SELECT EXISTS (
      SELECT 1 FROM mp_pair_tasks 
      WHERE pair_id = NEW.pair_id 
        AND status IN ('awaiting_review', 'completed')
        AND id != NEW.id 
    ) INTO v_has_started;

    IF v_has_started THEN
      -- Notify Mentor
      PERFORM mp_create_notification(v_pair.mentor_id, 'task_completed', 'New Task Assigned', 'The Supervisor has added a new task: ' || NEW.name, '/program-member/tasks?taskId=' || NEW.id, NEW.id);
      -- Notify Mentee
      PERFORM mp_create_notification(v_pair.mentee_id, 'task_completed', 'New Task Assigned', 'A new task has been added to your checklist: ' || NEW.name, '/program-member/tasks?taskId=' || NEW.id, NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Milestone alerts (50% / 100%) for Supervisors
CREATE OR REPLACE FUNCTION mp_notify_task_milestones()
RETURNS TRIGGER AS $$
DECLARE
  v_total INTEGER; v_completed INTEGER; v_pair RECORD; v_supervisor RECORD;
  v_type TEXT; v_title TEXT; v_desc TEXT;
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status) AND NEW.status = 'completed' THEN
    SELECT count(*) INTO v_total FROM mp_pair_tasks WHERE pair_id = NEW.pair_id;
    SELECT count(*) INTO v_completed FROM mp_pair_tasks WHERE pair_id = NEW.pair_id AND status = 'completed';
    SELECT m.full_name as mentor_name, me.full_name as mentee_name INTO v_pair
    FROM mp_pairs p JOIN mp_profiles m ON m.id = p.mentor_id JOIN mp_profiles me ON me.id = p.mentee_id WHERE p.id = NEW.pair_id;

    IF v_completed = v_total THEN
      v_type := 'pair_completed'; v_title := 'Program Checklist Completed';
      v_desc := 'Pair ' || v_pair.mentor_name || ' and ' || v_pair.mentee_name || ' have completed all tasks.';
    ELSIF v_completed >= v_total / 2 AND (v_completed - 1) < v_total / 2 THEN
      v_type := 'milestone_50'; v_title := '50% Milestone Reached';
      v_desc := 'Pair ' || v_pair.mentor_name || ' and ' || v_pair.mentee_name || ' has completed 50% of the Program Checklist.';
    ELSE
      RETURN NEW;
    END IF;

    FOR v_supervisor IN (SELECT id FROM mp_profiles WHERE role = 'supervisor') LOOP
      IF NOT EXISTS (SELECT 1 FROM mp_notifications WHERE recipient_id = v_supervisor.id AND type = v_type AND related_id = NEW.pair_id) THEN
        PERFORM mp_create_notification(v_supervisor.id, v_type, v_title, v_desc, '/supervisor/pairs?pairId=' || NEW.pair_id, NEW.pair_id);
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Pair Created (Initial Alert)
CREATE OR REPLACE FUNCTION mp_notify_pair_created()
RETURNS TRIGGER AS $$
DECLARE
  v_mentor_name TEXT; v_mentee_name TEXT;
BEGIN
  SELECT full_name INTO v_mentor_name FROM mp_profiles WHERE id = NEW.mentor_id;
  SELECT full_name INTO v_mentee_name FROM mp_profiles WHERE id = NEW.mentee_id;
  
  PERFORM mp_create_notification(NEW.mentor_id, 'pair_created', 'New Mentoring Pair Created', 'You have been paired with ' || v_mentee_name, '/program-member/dashboard', NEW.id);
  PERFORM mp_create_notification(NEW.mentee_id, 'pair_created', 'New Mentoring Pair Created', 'You have been paired with ' || v_mentor_name, '/program-member/dashboard', NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. PROFILE TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION mp_notify_profile_completed()
RETURNS TRIGGER AS $$
DECLARE
  v_supervisor RECORD;
BEGIN
  IF (OLD.full_name = '' OR OLD.full_name IS NULL OR OLD.job_title = '' OR OLD.job_title IS NULL)
     AND (NEW.full_name != '' AND NEW.full_name IS NOT NULL AND NEW.job_title != '' AND NEW.job_title IS NOT NULL) THEN
     FOR v_supervisor IN (SELECT id FROM mp_profiles WHERE role = 'supervisor') LOOP
       PERFORM mp_create_notification(v_supervisor.id, 'profile_completed', 'New Participant Onboarded', NEW.full_name || ' has completed their initial profile setup.', '/supervisor/participants?id=' || NEW.id, NEW.id);
     END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- APPLY ALL TRIGGERS
-- ============================================================================

-- mp_evidence_uploads (ONLY notify partner on upload, NEVER supervisor)
DROP TRIGGER IF EXISTS mp_on_evidence_uploaded ON mp_evidence_uploads;
CREATE TRIGGER mp_on_evidence_uploaded AFTER INSERT ON mp_evidence_uploads FOR EACH ROW EXECUTE FUNCTION mp_notify_evidence_uploaded();

DROP TRIGGER IF EXISTS mp_on_evidence_reviewed ON mp_evidence_uploads;
CREATE TRIGGER mp_on_evidence_reviewed AFTER UPDATE ON mp_evidence_uploads FOR EACH ROW EXECUTE FUNCTION mp_notify_evidence_reviewed();

-- mp_meetings
DROP TRIGGER IF EXISTS mp_on_meeting_changes ON mp_meetings;
CREATE TRIGGER mp_on_meeting_changes AFTER INSERT OR UPDATE ON mp_meetings FOR EACH ROW EXECUTE FUNCTION mp_notify_meeting_changes();

-- mp_pair_tasks
DROP TRIGGER IF EXISTS mp_on_task_added ON mp_pair_tasks;
CREATE TRIGGER mp_on_task_added AFTER INSERT ON mp_pair_tasks FOR EACH ROW EXECUTE FUNCTION mp_notify_task_added();

DROP TRIGGER IF EXISTS mp_on_task_status_change ON mp_pair_tasks;
CREATE TRIGGER mp_on_task_status_change AFTER UPDATE ON mp_pair_tasks FOR EACH ROW EXECUTE FUNCTION mp_notify_task_status_change();

DROP TRIGGER IF EXISTS mp_on_task_milestone ON mp_pair_tasks;
CREATE TRIGGER mp_on_task_milestone AFTER UPDATE ON mp_pair_tasks FOR EACH ROW EXECUTE FUNCTION mp_notify_task_milestones();

-- mp_pairs
DROP TRIGGER IF EXISTS mp_on_pair_created_notify ON mp_pairs;
CREATE TRIGGER mp_on_pair_created_notify AFTER INSERT ON mp_pairs FOR EACH ROW EXECUTE FUNCTION mp_notify_pair_created();

-- mp_profiles
DROP TRIGGER IF EXISTS mp_on_profile_completed ON mp_profiles;
CREATE TRIGGER mp_on_profile_completed AFTER UPDATE ON mp_profiles FOR EACH ROW EXECUTE FUNCTION mp_notify_profile_completed();
