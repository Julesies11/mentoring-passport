-- Fix RLS policies for mp_evidence_uploads table
-- First, ensure RLS is enabled
ALTER TABLE mp_evidence_uploads ENABLE ROW LEVEL SECURITY;

-- Drop any old policies that might exist from the rename or previous versions
DROP POLICY IF EXISTS "Users can view their evidence" ON mp_evidence_uploads;
DROP POLICY IF EXISTS "Pair members can submit evidence" ON mp_evidence_uploads;
DROP POLICY IF EXISTS "Users can update own pending evidence" ON mp_evidence_uploads;
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
    (SELECT role FROM mp_profiles WHERE id = auth.uid()) = 'supervisor'
  );

-- 2. INSERT: Pair members can submit evidence for their pairs
CREATE POLICY "Pair members can submit evidence"
  ON mp_evidence_uploads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mp_pairs
      WHERE mp_pairs.id = mp_evidence_uploads.pair_id
      AND (mentor_id = auth.uid() OR mentee_id = auth.uid())
    )
    AND submitted_by = auth.uid()
  );

-- 3. UPDATE: Users can update own pending evidence, or supervisors can review
CREATE POLICY "Users can update own pending evidence"
  ON mp_evidence_uploads FOR UPDATE
  TO authenticated
  USING (
    (submitted_by = auth.uid() AND status = 'pending')
    OR
    (SELECT role FROM mp_profiles WHERE id = auth.uid()) = 'supervisor'
  )
  WITH CHECK (
    (submitted_by = auth.uid() AND status = 'pending')
    OR
    (SELECT role FROM mp_profiles WHERE id = auth.uid()) = 'supervisor'
  );

-- 4. ALL: Supervisors can manage everything (alternative to specific policies above)
CREATE POLICY "Supervisors can manage all evidence"
  ON mp_evidence_uploads FOR ALL
  TO authenticated
  USING ((SELECT role FROM mp_profiles WHERE id = auth.uid()) = 'supervisor')
  WITH CHECK ((SELECT role FROM mp_profiles WHERE id = auth.uid()) = 'supervisor');
