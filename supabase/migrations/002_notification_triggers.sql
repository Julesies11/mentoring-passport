-- Notification Triggers for Mentoring Passport
-- Auto-create notifications when certain events occur

-- ============================================================================
-- HELPER FUNCTION: Create Notification
-- ============================================================================

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

-- ============================================================================
-- TRIGGER: Evidence Uploaded
-- ============================================================================

CREATE OR REPLACE FUNCTION mp_notify_evidence_uploaded()
RETURNS TRIGGER AS $$
DECLARE
  v_pair RECORD;
  v_task_name TEXT;
  v_submitter_name TEXT;
BEGIN
  -- Get pair information
  SELECT mentor_id, mentee_id INTO v_pair
  FROM mp_pairs
  WHERE id = NEW.pair_id;
  
  -- Get task name if applicable
  IF NEW.task_id IS NOT NULL THEN
    SELECT name INTO v_task_name
    FROM mp_tasks
    WHERE id = NEW.task_id;
  END IF;
  
  -- Get submitter name
  SELECT full_name INTO v_submitter_name
  FROM mp_profiles
  WHERE id = NEW.submitted_by;
  
  -- Notify the other person in the pair
  IF NEW.submitted_by = v_pair.mentor_id THEN
    -- Mentor submitted, notify mentee
    PERFORM mp_create_notification(
      v_pair.mentee_id,
      'evidence_uploaded',
      'New Evidence Uploaded',
      v_submitter_name || ' uploaded evidence' || COALESCE(' for: ' || v_task_name, ''),
      '/mentee/evidence',
      NEW.id
    );
  ELSE
    -- Mentee submitted, notify mentor
    PERFORM mp_create_notification(
      v_pair.mentor_id,
      'evidence_uploaded',
      'New Evidence Uploaded',
      v_submitter_name || ' uploaded evidence' || COALESCE(' for: ' || v_task_name, ''),
      '/mentor/evidence',
      NEW.id
    );
  END IF;
  
  -- Notify supervisor
  PERFORM create_notification(
    supervisor.id,
    'evidence_uploaded',
    'Evidence Awaiting Review',
    v_submitter_name || ' uploaded evidence' || COALESCE(' for: ' || v_task_name, ''),
    '/supervisor/evidence-review',
    NEW.id
  )
  FROM mp_profiles supervisor
  WHERE supervisor.role = 'supervisor';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER mp_on_evidence_uploaded
  AFTER INSERT ON mp_evidence
  FOR EACH ROW
  EXECUTE FUNCTION mp_notify_evidence_uploaded();

-- ============================================================================
-- TRIGGER: Evidence Approved/Rejected
-- ============================================================================

CREATE OR REPLACE FUNCTION mp_notify_evidence_reviewed()
RETURNS TRIGGER AS $$
DECLARE
  v_submitter_name TEXT;
BEGIN
  -- Only notify when status changes to approved or rejected
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    -- Get submitter name
    SELECT full_name INTO v_submitter_name
    FROM mp_profiles
    WHERE id = NEW.submitted_by;
    
    -- Notify the submitter
    PERFORM mp_create_notification(
      NEW.submitted_by,
      CASE 
        WHEN NEW.status = 'approved' THEN 'evidence_approved'
        ELSE 'evidence_rejected'
      END,
      CASE 
        WHEN NEW.status = 'approved' THEN 'Evidence Approved'
        ELSE 'Evidence Needs Revision'
      END,
      CASE 
        WHEN NEW.status = 'approved' THEN 'Your evidence has been approved by the supervisor'
        ELSE 'Your evidence needs revision. Please check the feedback.'
      END,
      CASE 
        WHEN NEW.submitted_by IN (SELECT mentor_id FROM mp_pairs WHERE id = NEW.pair_id) 
        THEN '/mentor/evidence'
        ELSE '/mentee/evidence'
      END,
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER mp_on_evidence_reviewed
  AFTER UPDATE ON mp_evidence
  FOR EACH ROW
  EXECUTE FUNCTION mp_notify_evidence_reviewed();

-- ============================================================================
-- TRIGGER: Note Added
-- ============================================================================

CREATE OR REPLACE FUNCTION mp_notify_note_added()
RETURNS TRIGGER AS $$
DECLARE
  v_pair RECORD;
  v_author_name TEXT;
BEGIN
  -- Get pair information
  SELECT mentor_id, mentee_id INTO v_pair
  FROM mp_pairs
  WHERE id = NEW.pair_id;
  
  -- Get author name
  SELECT full_name INTO v_author_name
  FROM mp_profiles
  WHERE id = NEW.author_id;
  
  -- Only notify for non-private notes
  IF NOT NEW.is_private THEN
    -- Notify the other person in the pair
    IF NEW.author_id = v_pair.mentor_id THEN
      -- Mentor added note, notify mentee
      PERFORM mp_create_notification(
        v_pair.mentee_id,
        'note_added',
        'New Note Added',
        v_author_name || ' added a note',
        '/mentee/notes',
        NEW.id
      );
    ELSE
      -- Mentee added note, notify mentor
      PERFORM mp_create_notification(
        v_pair.mentor_id,
        'note_added',
        'New Note Added',
        v_author_name || ' added a note',
        '/mentor/notes',
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER mp_on_note_added
  AFTER INSERT ON mp_notes
  FOR EACH ROW
  EXECUTE FUNCTION mp_notify_note_added();

-- ============================================================================
-- TRIGGER: Meeting Created
-- ============================================================================

CREATE OR REPLACE FUNCTION mp_notify_meeting_created()
RETURNS TRIGGER AS $$
DECLARE
  v_pair RECORD;
BEGIN
  -- Get pair information
  SELECT mentor_id, mentee_id INTO v_pair
  FROM mp_pairs
  WHERE id = NEW.pair_id;
  
  -- Notify both mentor and mentee
  PERFORM create_notification(
    v_pair.mentor_id,
    'meeting_created',
    'New Meeting Scheduled',
    'Meeting: ' || NEW.title || ' on ' || TO_CHAR(NEW.date_time, 'DD Mon YYYY at HH24:MI'),
    '/mentor/meetings',
    NEW.id
  );
  
  PERFORM create_notification(
    v_pair.mentee_id,
    'meeting_created',
    'New Meeting Scheduled',
    'Meeting: ' || NEW.title || ' on ' || TO_CHAR(NEW.date_time, 'DD Mon YYYY at HH24:MI'),
    '/mentee/meetings',
    NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER mp_on_meeting_created
  AFTER INSERT ON mp_meetings
  FOR EACH ROW
  EXECUTE FUNCTION mp_notify_meeting_created();

-- ============================================================================
-- TRIGGER: Pair Created
-- ============================================================================

CREATE OR REPLACE FUNCTION mp_notify_pair_created()
RETURNS TRIGGER AS $$
DECLARE
  v_mentor_name TEXT;
  v_mentee_name TEXT;
BEGIN
  -- Get names
  SELECT full_name INTO v_mentor_name
  FROM mp_profiles
  WHERE id = NEW.mentor_id;
  
  SELECT full_name INTO v_mentee_name
  FROM mp_profiles
  WHERE id = NEW.mentee_id;
  
  -- Notify mentor
  PERFORM create_notification(
    NEW.mentor_id,
    'pair_created',
    'New Mentoring Pair Created',
    'You have been paired with ' || v_mentee_name,
    '/mentor/mentees',
    NEW.id
  );
  
  -- Notify mentee
  PERFORM create_notification(
    NEW.mentee_id,
    'pair_created',
    'New Mentoring Pair Created',
    'You have been paired with ' || v_mentor_name,
    '/mentee/mentor',
    NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER mp_on_pair_created_notify
  AFTER INSERT ON mp_pairs
  FOR EACH ROW
  EXECUTE FUNCTION mp_notify_pair_created();

-- ============================================================================
-- TRIGGER: Task Completed
-- ============================================================================

CREATE OR REPLACE FUNCTION mp_notify_task_completed()
RETURNS TRIGGER AS $$
DECLARE
  v_pair RECORD;
  v_task_name TEXT;
BEGIN
  -- Only notify when status changes to completed
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    -- Get pair information
    SELECT mentor_id, mentee_id INTO v_pair
    FROM mp_pairs
    WHERE id = NEW.pair_id;
    
    -- Get task name
    SELECT name INTO v_task_name
    FROM mp_tasks
    WHERE id = NEW.task_id;
    
    -- Notify both mentor and mentee
    PERFORM mp_create_notification(
      v_pair.mentor_id,
      'task_completed',
      'Task Completed',
      'Task completed: ' || v_task_name,
      '/mentor/tasks',
      NEW.id
    );
    
    PERFORM mp_create_notification(
      v_pair.mentee_id,
      'task_completed',
      'Task Completed',
      'Task completed: ' || v_task_name,
      '/mentee/checklist',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER mp_on_task_completed
  AFTER UPDATE ON mp_pair_tasks
  FOR EACH ROW
  EXECUTE FUNCTION mp_notify_task_completed();
