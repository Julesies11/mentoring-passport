-- Migration to fix supervisor manage access for pair tasks and subtasks
-- This ensures supervisors can DELETE and manage custom tasks

DO $$
BEGIN
  -- 1. FIX PAIR TASKS POLICIES
  DROP POLICY IF EXISTS "Supervisors can manage pair tasks" ON mp_pair_tasks;
  DROP POLICY IF EXISTS "Supervisors can manage all pair tasks" ON mp_pair_tasks;
  
  CREATE POLICY "Supervisors can manage all pair tasks"
    ON mp_pair_tasks FOR ALL
    TO authenticated
    USING (mp_get_my_role() = 'supervisor')
    WITH CHECK (mp_get_my_role() = 'supervisor');

  -- 2. FIX PAIR SUBTASKS POLICIES
  DROP POLICY IF EXISTS "Supervisors can manage all subtasks" ON mp_pair_subtasks;
  
  CREATE POLICY "Supervisors can manage all subtasks"
    ON mp_pair_subtasks FOR ALL
    TO authenticated
    USING (mp_get_my_role() = 'supervisor')
    WITH CHECK (mp_get_my_role() = 'supervisor');

  -- 3. ENSURE VIEW POLICIES ALSO COVER SUPERVISORS EXPLICITLY
  -- (Already done in 006, but good to ensure consistency)
  
END $$;
