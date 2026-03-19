import { supabase } from '@/lib/supabase';
import { PROGRAM_STATUS, ProgramStatus, ROLES } from '@/config/constants';

export interface Program {
  id: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status: ProgramStatus;
  task_list_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProgramInput {
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status: ProgramStatus;
  task_list_id?: string;
}

export interface UpdateProgramInput {
  name?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status?: ProgramStatus;
  task_list_id?: string;
}

/**
 * Fetch all programs for the organisation instance
 */
export async function fetchPrograms(): Promise<Program[]> {
  try {
    const { data, error } = await supabase
      .from('mp_programs')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching programs:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchPrograms:', error);
    throw error;
  }
}

/**
 * Fetch programs assigned to a supervisor
 * Admins and Org Admins see all programs.
 */
export async function fetchAssignedPrograms(): Promise<Program[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return [];

  // Use JWT metadata for role check to avoid RLS recursion on mp_profiles
  const role = user.app_metadata?.role;
  const isPrivileged = role === ROLES.ADMINISTRATOR || role === ROLES.ORG_ADMIN;

  // If Admin or Org Admin, they see all programs in the instance
  if (isPrivileged) {
    return fetchPrograms();
  }

  // Regular supervisors only return assigned programs via the bridge table
  const { data, error } = await supabase
    .from('mp_programs')
    .select('*, mp_supervisor_programs!inner(user_id)')
    .eq('mp_supervisor_programs.user_id', user.id)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching assigned programs:', error);
    throw error;
  }

  // Clean join data
  return (data || []).map((p: any) => {
    const { mp_supervisor_programs: _sp, ...program } = p;
    return program as Program;
  });
}

/**
 * Fetch a single program by ID
 */
export async function fetchProgram(id: string): Promise<Program | null> {
  const { data, error } = await supabase
    .from('mp_programs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

/**
 * Create a new program
 * Also copies tasks from the assigned master task list to mp_program_tasks
 */
export async function createProgram(input: CreateProgramInput): Promise<Program> {
  // 1. Create the program
  const { data: program, error: programError } = await supabase
    .from('mp_programs')
    .insert(input)
    .select()
    .single();

  if (programError) {
    console.error('Error creating program:', programError);
    throw programError;
  }

  // 2. If a task list was assigned, copy tasks to program tasks
  if (input.task_list_id) {
    await syncProgramTasks(program.id, input.task_list_id);
  }

  return program;
}

/**
 * Update a program
 */
export async function updateProgram(id: string, input: UpdateProgramInput): Promise<Program> {
  // 1. Fetch current program to see if task_list_id is changing
  const { data: currentProgram } = await supabase
    .from('mp_programs')
    .select('task_list_id, status')
    .eq('id', id)
    .single();

  // 2. Validate: Cannot change task list for inactive programs
  if (
    input.task_list_id !== undefined && 
    input.task_list_id !== currentProgram?.task_list_id &&
    currentProgram?.status !== PROGRAM_STATUS.ACTIVE
  ) {
    throw new Error('Task list cannot be changed for an inactive or archived program.');
  }

  // 3. Update the program
  const { data: program, error } = await supabase
    .from('mp_programs')
    .update({
      ...input,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating program:', error);
    throw error;
  }

  // 4. If task_list_id changed, sync tasks
  if (input.task_list_id !== undefined && input.task_list_id !== currentProgram?.task_list_id) {
    await syncProgramTasks(program.id, input.task_list_id);
  }

  return program;
}

/**
 * Sync program tasks from a master task list
 * Deletes existing program tasks and copies new ones
 */
async function syncProgramTasks(programId: string, taskListId: string | null): Promise<void> {
  // 1. Delete existing program tasks (cascades to subtasks)
  const { error: deleteError } = await supabase
    .from('mp_program_tasks')
    .delete()
    .eq('program_id', programId);

  if (deleteError) {
    console.error('Error deleting old program tasks during sync:', deleteError);
  }

  // 2. If no new list, we're done
  if (!taskListId) return;

  // 3. Fetch new master tasks
  const { data: masterTasks, error: tasksError } = await supabase
    .from('mp_tasks_master')
    .select('id, name, evidence_type_id, sort_order')
    .eq('task_list_id', taskListId)
    .eq('is_active', true);

  if (tasksError) {
    console.error('Error fetching master tasks for sync:', tasksError);
    return;
  }

  if (masterTasks && masterTasks.length > 0) {
    for (const masterTask of masterTasks) {
      // Create program task
      const { data: programTask, error: ptError } = await supabase
        .from('mp_program_tasks')
        .insert({
          program_id: programId,
          name: masterTask.name,
          evidence_type_id: masterTask.evidence_type_id,
          sort_order: masterTask.sort_order,
          master_task_id: masterTask.id,
          is_active: true
        })
        .select()
        .single();

      if (ptError) {
        console.error('Error creating program task during sync:', ptError);
        continue;
      }

      // Fetch master subtasks
      const { data: masterSubtasks, error: stError } = await supabase
        .from('mp_subtasks_master')
        .select('id, name, sort_order')
        .eq('task_id', masterTask.id);

      if (stError) {
        console.error('Error fetching master subtasks during sync:', stError);
        continue;
      }

      if (masterSubtasks && masterSubtasks.length > 0) {
        const programSubtasks = masterSubtasks.map(st => ({
          program_task_id: programTask.id,
          name: st.name,
          sort_order: st.sort_order,
          master_subtask_id: st.id
        }));

        const { error: pstError } = await supabase
          .from('mp_program_subtasks')
          .insert(programSubtasks);

        if (pstError) {
          console.error('Error creating program subtasks during sync:', pstError);
        }
      }
    }
  }
}

/**
 * Archive a program
 */
export async function archiveProgram(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('mp_programs')
      .update({ status: PROGRAM_STATUS.ARCHIVED })
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error archiving program:', error);
    throw error;
  }
}

/**
 * Duplicate a program (creates a new program with same template and settings, but no pairs)
 */
export async function duplicateProgram(sourceId: string, newName: string): Promise<Program> {
  const { data: source, error: fetchError } = await supabase
    .from('mp_programs')
    .select('*')
    .eq('id', sourceId)
    .single();

  if (fetchError) throw fetchError;

  const { id: _id, created_at: _ca, updated_at: _ua, ...sourceData } = source;

  return createProgram({
    ...sourceData,
    name: newName,
    status: PROGRAM_STATUS.INACTIVE // Start as inactive
  });
}
