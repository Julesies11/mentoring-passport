-- Fix Evidence RLS Policies to allow resubmission and handle NULL task IDs
-- Version 2: Explicitly drops all potential legacy policy names
DO $$
BEGIN
  -- 1. Reset Evidence Table RLS
  ALTER TABLE mp_evidence_uploads ENABLE ROW LEVEL SECURITY;
  
  -- Drop NEW policy names
  DROP POLICY IF EXISTS "evidence_select_policy" ON mp_evidence_uploads;
  DROP POLICY IF EXISTS "evidence_insert_policy" ON mp_evidence_uploads;
  DROP POLICY IF EXISTS "evidence_mod_policy" ON mp_evidence_uploads;
  
  -- Drop OLD policy names from previous migrations
  DROP POLICY IF EXISTS "Users can view their evidence" ON mp_evidence_uploads;
  DROP POLICY IF EXISTS "Pair members can submit evidence" ON mp_evidence_uploads;
  DROP POLICY IF EXISTS "Users can manage own evidence" ON mp_evidence_uploads;
  DROP POLICY IF EXISTS "Users can update/delete own evidence" ON mp_evidence_uploads;
  DROP POLICY IF EXISTS "Users can update/delete own pending evidence" ON mp_evidence_uploads;
  DROP POLICY IF EXISTS "Supervisors can manage all evidence" ON mp_evidence_uploads;

  -- 2. CREATE NEW POLICIES

  -- SELECT: Users see their pair's evidence or if they are supervisor
  CREATE POLICY "evidence_select_policy" ON mp_evidence_uploads FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM mp_pairs p 
        WHERE p.id = pair_id 
        AND (p.mentor_id = auth.uid() OR p.mentee_id = auth.uid())
      )
      OR mp_get_my_role() = 'supervisor'
    );

  -- INSERT: Allow if user is member of pair and task is NOT completed
  CREATE POLICY "evidence_insert_policy" ON mp_evidence_uploads FOR INSERT TO authenticated
    WITH CHECK (
      (
        submitted_by = auth.uid() 
        AND EXISTS (
          SELECT 1 FROM mp_pairs p 
          WHERE p.id = pair_id 
          AND (p.mentor_id = auth.uid() OR p.mentee_id = auth.uid())
        )
        AND (
          pair_task_id IS NULL OR EXISTS (
            SELECT 1 FROM mp_pair_tasks t 
            WHERE t.id = pair_task_id 
            AND t.status IN ('not_submitted', 'awaiting_review', 'revision_required')
          )
        )
      )
      OR mp_get_my_role() = 'supervisor'
    );

  -- ALL (Update/Delete): Allow if owner and task is NOT completed
  CREATE POLICY "evidence_mod_policy" ON mp_evidence_uploads FOR ALL TO authenticated
    USING (
      (
        submitted_by = auth.uid() 
        AND (
          pair_task_id IS NULL OR EXISTS (
            SELECT 1 FROM mp_pair_tasks t 
            WHERE t.id = pair_task_id 
            AND t.status IN ('not_submitted', 'awaiting_review', 'revision_required')
          )
        )
      )
      OR mp_get_my_role() = 'supervisor'
    );

END $$;
