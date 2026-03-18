-- Migration 068: Allow Participants to Add and Delete Custom Tasks
-- Enforces that program members can create tasks for their own pairs
-- and only delete custom tasks they or their partner added.

-- ============================================================================
-- 1. HARDEN mp_pair_tasks (Participant Insert/Delete)
-- ============================================================================

-- Drop old policies to replace with comprehensive ones
DROP POLICY IF EXISTS "jwt_pair_task_insert" ON mp_pair_tasks;
DROP POLICY IF EXISTS "jwt_pair_task_delete" ON mp_pair_tasks;

-- 1.1. INSERT: Allow privileged users OR participants of the pair (MUST BE CUSTOM)
CREATE POLICY "jwt_pair_task_insert" ON mp_pair_tasks FOR INSERT TO authenticated 
  WITH CHECK (
    public.is_privileged() 
    OR (
      organisation_id = public.active_org_id() 
      AND is_custom = true 
      AND EXISTS (
        SELECT 1 FROM mp_pairs WHERE id = pair_id AND (mentor_id = auth.uid() OR mentee_id = auth.uid())
      )
    )
  );

-- 1.2. DELETE: Allow privileged users (all) OR participants (CUSTOM ONLY)
CREATE POLICY "jwt_pair_task_delete" ON mp_pair_tasks FOR DELETE TO authenticated 
  USING (
    (public.is_privileged() AND organisation_id = public.active_org_id())
    OR (organisation_id = public.active_org_id() AND is_custom = true AND EXISTS (
      SELECT 1 FROM mp_pairs WHERE id = pair_id AND (mentor_id = auth.uid() OR mentee_id = auth.uid())
    ))
  );

-- ============================================================================
-- 2. HARDEN mp_pair_subtasks (Consistency)
-- ============================================================================
-- Subtasks already had a broad jwt_pair_subtask_all policy, but let's refine it
-- to ensure they can only delete custom subtasks if not privileged.

DROP POLICY IF EXISTS "jwt_pair_subtask_all" ON mp_pair_subtasks;

CREATE POLICY "jwt_pair_subtask_view" ON mp_pair_subtasks FOR SELECT TO authenticated 
  USING (
    public.is_privileged() 
    OR EXISTS (
      SELECT 1 FROM mp_pair_tasks pt
      JOIN mp_pairs p ON pt.pair_id = p.id
      WHERE pt.id = pair_task_id 
      AND p.organisation_id = public.active_org_id()
      AND (p.mentor_id = auth.uid() OR p.mentee_id = auth.uid())
    )
  );

CREATE POLICY "jwt_pair_subtask_insert" ON mp_pair_subtasks FOR INSERT TO authenticated 
  WITH CHECK (
    public.is_privileged() 
    OR EXISTS (
      SELECT 1 FROM mp_pair_tasks pt
      JOIN mp_pairs p ON pt.pair_id = p.id
      WHERE pt.id = pair_task_id 
      AND p.organisation_id = public.active_org_id()
      AND (p.mentor_id = auth.uid() OR p.mentee_id = auth.uid())
    )
  );

CREATE POLICY "jwt_pair_subtask_update" ON mp_pair_subtasks FOR UPDATE TO authenticated 
  USING (
    public.is_privileged() 
    OR EXISTS (
      SELECT 1 FROM mp_pair_tasks pt
      JOIN mp_pairs p ON pt.pair_id = p.id
      WHERE pt.id = pair_task_id 
      AND p.organisation_id = public.active_org_id()
      AND (p.mentor_id = auth.uid() OR p.mentee_id = auth.uid())
    )
  );

CREATE POLICY "jwt_pair_subtask_delete" ON mp_pair_subtasks FOR DELETE TO authenticated 
  USING (
    (public.is_privileged() AND EXISTS (
      SELECT 1 FROM mp_pair_tasks pt 
      WHERE pt.id = pair_task_id AND pt.organisation_id = public.active_org_id()
    ))
    OR (is_custom = true AND EXISTS (
      SELECT 1 FROM mp_pair_tasks pt
      JOIN mp_pairs p ON pt.pair_id = p.id
      WHERE pt.id = pair_task_id 
      AND p.organisation_id = public.active_org_id()
      AND (p.mentor_id = auth.uid() OR p.mentee_id = auth.uid())
    ))
  );
