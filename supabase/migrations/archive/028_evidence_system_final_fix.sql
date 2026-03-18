-- Final Comprehensive Fix for Evidence and Notifications
DO $$
BEGIN
  -- 1. Ensure all metadata columns exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mp_evidence_uploads' AND column_name = 'file_name') THEN
    ALTER TABLE mp_evidence_uploads ADD COLUMN file_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mp_evidence_uploads' AND column_name = 'mime_type') THEN
    ALTER TABLE mp_evidence_uploads ADD COLUMN mime_type TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mp_evidence_uploads' AND column_name = 'file_size') THEN
    ALTER TABLE mp_evidence_uploads ADD COLUMN file_size BIGINT;
  END IF;

  -- 2. Update type check constraint to be more permissive
  ALTER TABLE mp_evidence_uploads DROP CONSTRAINT IF EXISTS mp_evidence_type_check;
  ALTER TABLE mp_evidence_uploads ADD CONSTRAINT mp_evidence_type_check CHECK (type IN ('photo', 'text', 'file'));

  -- 3. Reset and Simplify Evidence Table RLS
  ALTER TABLE mp_evidence_uploads ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "Users can view their evidence" ON mp_evidence_uploads;
  DROP POLICY IF EXISTS "Pair members can submit evidence" ON mp_evidence_uploads;
  DROP POLICY IF EXISTS "Users can update/delete own evidence" ON mp_evidence_uploads;
  DROP POLICY IF EXISTS "Supervisors can manage all evidence" ON mp_evidence_uploads;

  -- SELECT: Users see their pair's evidence
  CREATE POLICY "evidence_select_policy" ON mp_evidence_uploads FOR SELECT TO authenticated
    USING (
      EXISTS (SELECT 1 FROM mp_pairs p WHERE p.id = pair_id AND (p.mentor_id = auth.uid() OR p.mentee_id = auth.uid()))
      OR mp_get_my_role() = 'supervisor'
    );

  -- INSERT: Allow if task is NOT completed
  CREATE POLICY "evidence_insert_policy" ON mp_evidence_uploads FOR INSERT TO authenticated
    WITH CHECK (
      (
        submitted_by = auth.uid() 
        AND EXISTS (
          SELECT 1 FROM mp_pair_tasks t 
          WHERE t.id = pair_task_id 
          AND t.status IN ('not_submitted', 'awaiting_review')
        )
      )
      OR mp_get_my_role() = 'supervisor'
    );

  -- ALL (Update/Delete): Allow if task is NOT completed
  CREATE POLICY "evidence_mod_policy" ON mp_evidence_uploads FOR ALL TO authenticated
    USING (
      (
        submitted_by = auth.uid() 
        AND EXISTS (
          SELECT 1 FROM mp_pair_tasks t 
          WHERE t.id = pair_task_id 
          AND t.status IN ('not_submitted', 'awaiting_review')
        )
      )
      OR mp_get_my_role() = 'supervisor'
    );

  -- 4. Fix Notifications RLS (Fire and Forget)
  DROP POLICY IF EXISTS "Users can create notifications" ON mp_notifications;
  CREATE POLICY "notifications_insert_policy" ON mp_notifications FOR INSERT TO authenticated WITH CHECK (true);

  -- 5. Final Storage Policy Reset
  DROP POLICY IF EXISTS "Supervisors full access" ON storage.objects;
  DROP POLICY IF EXISTS "Members view own pair evidence" ON storage.objects;
  DROP POLICY IF EXISTS "Members upload to own pair" ON storage.objects;
  DROP POLICY IF EXISTS "Members delete from own pair" ON storage.objects;

  CREATE POLICY "storage_all_supervisor" ON storage.objects FOR ALL TO authenticated
    USING (bucket_id = 'mp-evidence-photos' AND mp_get_my_role() = 'supervisor');

  CREATE POLICY "storage_select_member" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'mp-evidence-photos');

  CREATE POLICY "storage_insert_member" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'mp-evidence-photos');

  CREATE POLICY "storage_delete_member" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'mp-evidence-photos');

END $$;
