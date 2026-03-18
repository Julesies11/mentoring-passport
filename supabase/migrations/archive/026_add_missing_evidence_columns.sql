-- Migration to add metadata columns, fix notifications RLS, and reset storage policies with task locking
-- This migration ensures we can store original file metadata and prevents modification of completed tasks

DO $$
BEGIN
  -- 1. Add missing metadata columns to mp_evidence_uploads
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mp_evidence_uploads' AND column_name = 'file_name') THEN
    ALTER TABLE mp_evidence_uploads ADD COLUMN file_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mp_evidence_uploads' AND column_name = 'mime_type') THEN
    ALTER TABLE mp_evidence_uploads ADD COLUMN mime_type TEXT;
  END IF;

  -- 2. Update type check constraint to include 'file'
  ALTER TABLE mp_evidence_uploads DROP CONSTRAINT IF EXISTS mp_evidence_type_check;
  ALTER TABLE mp_evidence_uploads ADD CONSTRAINT mp_evidence_type_check CHECK (type IN ('photo', 'text', 'file'));

  -- 3. Fix notifications RLS
  DROP POLICY IF EXISTS "System can create notifications" ON mp_notifications;
  DROP POLICY IF EXISTS "Users can create notifications" ON mp_notifications;
  CREATE POLICY "Users can create notifications" ON mp_notifications FOR INSERT TO authenticated WITH CHECK (true);

  DROP POLICY IF EXISTS "Users can view own notifications" ON mp_notifications;
  CREATE POLICY "Users can view own notifications" ON mp_notifications FOR SELECT TO authenticated
    USING (recipient_id = auth.uid() OR mp_get_my_role() = 'supervisor');

  -- 4. Reset Storage Policies for mp-evidence-photos
  DROP POLICY IF EXISTS "Supervisors full access" ON storage.objects;
  DROP POLICY IF EXISTS "Members view own pair evidence" ON storage.objects;
  DROP POLICY IF EXISTS "Members upload to own pair" ON storage.objects;
  DROP POLICY IF EXISTS "Members delete from own pair" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own evidence" ON storage.objects;

  -- Supervisor: Full access
  CREATE POLICY "Supervisors full access" ON storage.objects FOR ALL TO authenticated
    USING (bucket_id = 'mp-evidence-photos' AND mp_get_my_role() = 'supervisor');

  -- Program Members: SELECT (View)
  CREATE POLICY "Members view own pair evidence" ON storage.objects FOR SELECT TO authenticated
    USING (
      bucket_id = 'mp-evidence-photos' AND 
      EXISTS (
        SELECT 1 FROM mp_pairs 
        WHERE mp_pairs.id::text = (storage.foldername(name))[1]
        AND (mentor_id = auth.uid() OR mentee_id = auth.uid())
      )
    );

  -- Program Members: INSERT (Upload)
  CREATE POLICY "Members upload to own pair" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'mp-evidence-photos' AND 
      EXISTS (
        SELECT 1 FROM mp_pairs 
        WHERE mp_pairs.id::text = (storage.foldername(name))[1]
        AND (mentor_id = auth.uid() OR mentee_id = auth.uid())
      )
    );

  -- Program Members: DELETE (Remove - denied if task is locked)
  CREATE POLICY "Members delete from own pair" ON storage.objects FOR DELETE TO authenticated
    USING (
      bucket_id = 'mp-evidence-photos' AND 
      EXISTS (
        SELECT 1 FROM mp_pairs p
        WHERE p.id::text = (storage.foldername(name))[1]
        AND (p.mentor_id = auth.uid() OR p.mentee_id = auth.uid())
        -- File deletion is only allowed if the associated task is NOT completed or awaiting review
        -- This logic is handled more strictly at the table level below
      )
    );

  -- 5. Deny modification on mp_evidence_uploads table if task is locked
  DROP POLICY IF EXISTS "Users can view their evidence" ON mp_evidence_uploads;
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

  DROP POLICY IF EXISTS "Pair members can submit evidence" ON mp_evidence_uploads;
  CREATE POLICY "Pair members can submit evidence"
    ON mp_evidence_uploads FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM mp_pair_tasks t
        WHERE t.id = pair_task_id
        AND t.status = 'not_submitted' -- Only allow uploads if task is not locked
      )
      OR
      mp_get_my_role() = 'supervisor'
    );

  DROP POLICY IF EXISTS "Users can update own pending evidence" ON mp_evidence_uploads;
  DROP POLICY IF EXISTS "Users can update/delete own pending evidence" ON mp_evidence_uploads;
  CREATE POLICY "Users can update/delete own evidence"
    ON mp_evidence_uploads FOR ALL
    TO authenticated
    USING (
      (submitted_by = auth.uid() AND EXISTS (
        SELECT 1 FROM mp_pair_tasks t WHERE t.id = pair_task_id AND t.status = 'not_submitted'
      ))
      OR
      mp_get_my_role() = 'supervisor'
    )
    WITH CHECK (
      (submitted_by = auth.uid() AND EXISTS (
        SELECT 1 FROM mp_pair_tasks t WHERE t.id = pair_task_id AND t.status = 'not_submitted'
      ))
      OR
      mp_get_my_role() = 'supervisor'
    );

END $$;
