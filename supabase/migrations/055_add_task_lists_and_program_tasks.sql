-- Migration 055: Add Master Task Lists and Program-specific Tasks

-- 1. Create Master Task Lists table (Managed by Org Admins)
CREATE TABLE IF NOT EXISTS mp_task_lists_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES mp_organisations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Update mp_tasks_master to link to a Task List
ALTER TABLE mp_tasks_master ADD COLUMN IF NOT EXISTS task_list_id UUID REFERENCES mp_task_lists_master(id) ON DELETE CASCADE;

-- 3. Update mp_programs to reference the source Task List
ALTER TABLE mp_programs ADD COLUMN IF NOT EXISTS task_list_id UUID REFERENCES mp_task_lists_master(id) ON DELETE SET NULL;

-- 4. Create Program Tasks table (Instance of a Task List for a specific program)
-- These can be edited by Supervisors without affecting the Master List
CREATE TABLE IF NOT EXISTS mp_program_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES mp_programs(id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL REFERENCES mp_organisations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    evidence_type_id UUID REFERENCES mp_evidence_types(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    master_task_id UUID REFERENCES mp_tasks_master(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create Program Subtasks table
CREATE TABLE IF NOT EXISTS mp_program_subtasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_task_id UUID NOT NULL REFERENCES mp_program_tasks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    master_subtask_id UUID REFERENCES mp_subtasks_master(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Update mp_pair_tasks to link to Program Tasks and add is_custom flag
ALTER TABLE mp_pair_tasks ADD COLUMN IF NOT EXISTS program_task_id UUID REFERENCES mp_program_tasks(id) ON DELETE SET NULL;
ALTER TABLE mp_pair_tasks ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false;

-- 7. Update mp_pair_subtasks to add is_custom flag
ALTER TABLE mp_pair_subtasks ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false;

-- 8. Enable RLS
ALTER TABLE mp_task_lists_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE mp_program_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mp_program_subtasks ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies

-- --- mp_task_lists_master RLS ---
CREATE POLICY "system_owner_task_lists_all" ON mp_task_lists_master FOR ALL TO authenticated USING (public.is_system_owner());
CREATE POLICY "org_admin_task_lists_all" ON mp_task_lists_master FOR ALL TO authenticated USING (public.is_org_admin(organisation_id));
CREATE POLICY "supervisor_task_lists_view" ON mp_task_lists_master FOR SELECT TO authenticated 
    USING (EXISTS (SELECT 1 FROM mp_memberships m WHERE m.user_id = auth.uid() AND m.organisation_id = mp_task_lists_master.organisation_id AND m.role = 'supervisor'));

-- --- mp_program_tasks RLS ---
CREATE POLICY "system_owner_program_tasks_all" ON mp_program_tasks FOR ALL TO authenticated USING (public.is_system_owner());
CREATE POLICY "org_admin_program_tasks_all" ON mp_program_tasks FOR ALL TO authenticated USING (public.is_org_admin(organisation_id));
CREATE POLICY "supervisor_program_tasks_all" ON mp_program_tasks FOR ALL TO authenticated USING (public.is_program_supervisor(program_id));
CREATE POLICY "member_program_tasks_view" ON mp_program_tasks FOR SELECT TO authenticated 
    USING (EXISTS (SELECT 1 FROM mp_pairs p WHERE p.program_id = program_id AND (p.mentor_id = auth.uid() OR p.mentee_id = auth.uid())));

-- --- mp_program_subtasks RLS ---
CREATE POLICY "system_owner_program_subtasks_all" ON mp_program_subtasks FOR ALL TO authenticated USING (public.is_system_owner());
CREATE POLICY "program_subtasks_via_parent" ON mp_program_subtasks FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM mp_program_tasks pt WHERE pt.id = program_task_id));

-- Update existing pair_tasks and pair_subtasks RLS if needed (they mostly use parent scoping already)
