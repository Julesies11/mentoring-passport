-- Fix the task completed trigger to use the correct table and column names
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
    
    -- Task name is now directly in the mp_pair_tasks table
    v_task_name := NEW.name;
    
    -- Notify mentor
    IF v_pair.mentor_id IS NOT NULL THEN
      PERFORM mp_create_notification(
        v_pair.mentor_id,
        'task_completed',
        'Task Completed',
        'Task completed by mentee: ' || v_task_name,
        '/mentor/tasks',
        NEW.id
      );
    END IF;
    
    -- Notify mentee
    IF v_pair.mentee_id IS NOT NULL THEN
      PERFORM mp_create_notification(
        v_pair.mentee_id,
        'task_completed',
        'Task Completed',
        'You completed the task: ' || v_task_name,
        '/mentee/checklist',
        NEW.id
      );
    END IF;

    -- Notify supervisor
    FOR v_pair IN (SELECT id FROM mp_profiles WHERE role = 'supervisor') LOOP
      PERFORM mp_create_notification(
        v_pair.id,
        'task_completed',
        'Task Completed',
        'Task completed in a pairing: ' || v_task_name,
        '/supervisor/evidence-review',
        NEW.id
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
