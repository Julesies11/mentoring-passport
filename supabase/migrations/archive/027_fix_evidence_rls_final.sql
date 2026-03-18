-- Migration to fix evidence uploads RLS with explicit qualification
-- This ensures the policies correctly reference the new row's columns

DO $$
BEGIN
  -- Reset all evidence upload policies
  DROP POLICY IF EXISTS "Users can view their evidence" ON mp_evidence_uploads;
  DROP POLICY IF EXISTS "Pair members can submit evidence" ON mp_evidence_uploads;
  DROP POLICY IF EXISTS "Users can manage own evidence" ON mp_evidence_uploads;
  DROP POLICY IF EXISTS "Users can update/delete own evidence" ON mp_evidence_uploads;
  DROP POLICY IF EXISTS "Users can update/delete own pending evidence" ON mp_evidence_uploads;
  DROP POLICY IF EXISTS "Supervisors can manage all evidence" ON mp_evidence_uploads;

  -- 1. SELECT: Users can view evidence for their pairs, or supervisors can view all
  CREATE POLICY "Users can view their evidence"
    ON mp_evidence_uploads FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM mp_pairs
        WHERE mp_pairs.id = mp_evidence_uploads.pair_id
        AND (mentor_id = auth.uid() OR mentee_id = auth.uid())
      )
      OR 
      mp_get_my_role() = 'supervisor'
    );

  -- 2. INSERT: Pair members can submit evidence for their pairs
  -- ONLY if the task status is 'not_submitted'
  CREATE POLICY "Pair members can submit evidence"
    ON mp_evidence_uploads FOR INSERT
    TO authenticated
    WITH CHECK (
      (
        EXISTS (
          SELECT 1 FROM mp_pair_tasks t
          WHERE t.id = mp_evidence_uploads.pair_task_id
          AND t.status = 'not_submitted'
        )
        AND 
        EXISTS (
          SELECT 1 FROM mp_pairs p
          WHERE p.id = mp_evidence_uploads.pair_id
          AND (p.mentor_id = auth.uid() OR p.mentee_id = auth.uid())
        )
        AND submitted_by = auth.uid()
      )
      OR
      mp_get_my_role() = 'supervisor'
    );

  -- 3. UPDATE/DELETE: Users can update/delete their own evidence
  -- ONLY if the task status is 'not_submitted'
  CREATE POLICY "Users can manage own evidence"
    ON mp_evidence_uploads FOR ALL 
    TO authenticated
    USING (
      (
        submitted_by = auth.uid() 
        AND 
        EXISTS (
          SELECT 1 FROM mp_pair_tasks t
          WHERE t.id = mp_evidence_uploads.pair_task_id
          AND t.status = 'not_submitted'
        )
      )
      OR
      mp_get_my_role() = 'supervisor'
    )
    WITH CHECK (
      (
        submitted_by = auth.uid() 
        AND 
        EXISTS (
          SELECT 1 FROM mp_pair_tasks t
          WHERE t.id = mp_evidence_uploads.pair_task_id
          AND t.status = 'not_submitted'
        )
      )
      OR
      mp_get_my_role() = 'supervisor'
    );

END $$;
