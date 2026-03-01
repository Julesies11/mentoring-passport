-- Migration to fix notification creation RLS
-- Allow authenticated users to create notifications

DO $$
BEGIN
  -- Drop existing insert policy if it exists
  DROP POLICY IF EXISTS "System can create notifications" ON mp_notifications;

  -- Create new policy allowing any authenticated user to create notifications
  CREATE POLICY "Users can create notifications"
    ON mp_notifications FOR INSERT
    TO authenticated
    WITH CHECK (true);

  -- Ensure users can still only view their own
  DROP POLICY IF EXISTS "Users can view own notifications" ON mp_notifications;
  CREATE POLICY "Users can view own notifications"
    ON mp_notifications FOR SELECT
    TO authenticated
    USING (recipient_id = auth.uid() OR mp_get_my_role() = 'supervisor');

END $$;
