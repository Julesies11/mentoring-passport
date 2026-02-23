-- Fix trigger functions to work with RLS by making them SECURITY DEFINER
-- This allows triggers to bypass RLS when performing system operations

-- Fix mp_create_pair_tasks_for_new_pair trigger function
CREATE OR REPLACE FUNCTION mp_create_pair_tasks_for_new_pair()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER  -- Run with elevated privileges to bypass RLS
SET search_path = public
AS $$
BEGIN
  INSERT INTO mp_pair_tasks (pair_id, task_id, status)
  SELECT NEW.id, id, 'not_submitted'
  FROM mp_tasks;
  RETURN NEW;
END;
$$;

-- Re-enable RLS on mp_pair_tasks
ALTER TABLE mp_pair_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for mp_pair_tasks
DROP POLICY IF EXISTS "Users can view their pair tasks" ON mp_pair_tasks;
DROP POLICY IF EXISTS "Users can update their pair tasks" ON mp_pair_tasks;
DROP POLICY IF EXISTS "Mentees can submit tasks" ON mp_pair_tasks;
DROP POLICY IF EXISTS "Mentors can review tasks" ON mp_pair_tasks;

-- Users can view pair_tasks for their pairs
CREATE POLICY "Users can view their pair tasks"
  ON mp_pair_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mp_pairs
      WHERE mp_pairs.id = mp_pair_tasks.pair_id
      AND (mp_pairs.mentor_id = auth.uid() OR mp_pairs.mentee_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM mp_profiles
      WHERE id = auth.uid() AND role = 'supervisor'
    )
  );

-- Mentees can update their pair tasks (submit for review)
CREATE POLICY "Mentees can submit tasks"
  ON mp_pair_tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mp_pairs
      WHERE mp_pairs.id = mp_pair_tasks.pair_id
      AND mp_pairs.mentee_id = auth.uid()
    )
  );

-- Mentors can update pair tasks (approve/reject)
CREATE POLICY "Mentors can review tasks"
  ON mp_pair_tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mp_pairs
      WHERE mp_pairs.id = mp_pair_tasks.pair_id
      AND mp_pairs.mentor_id = auth.uid()
    )
  );

-- Re-enable RLS on mp_pairs
ALTER TABLE mp_pairs ENABLE ROW LEVEL SECURITY;

-- Create policies for mp_pairs
DROP POLICY IF EXISTS "Users can view their own pairs" ON mp_pairs;
DROP POLICY IF EXISTS "Supervisors can insert pairs" ON mp_pairs;
DROP POLICY IF EXISTS "Supervisors can update pairs" ON mp_pairs;
DROP POLICY IF EXISTS "Supervisors can delete pairs" ON mp_pairs;

CREATE POLICY "Users can view their own pairs"
  ON mp_pairs FOR SELECT
  TO authenticated
  USING (
    mentor_id = auth.uid() OR
    mentee_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM mp_profiles
      WHERE id = auth.uid() AND role = 'supervisor'
    )
  );

CREATE POLICY "Supervisors can insert pairs"
  ON mp_pairs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mp_profiles
      WHERE id = auth.uid() AND role = 'supervisor'
    )
  );

CREATE POLICY "Supervisors can update pairs"
  ON mp_pairs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mp_profiles
      WHERE id = auth.uid() AND role = 'supervisor'
    )
  );

CREATE POLICY "Supervisors can delete pairs"
  ON mp_pairs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mp_profiles
      WHERE id = auth.uid() AND role = 'supervisor'
    )
  );
