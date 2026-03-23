import { 
  TASK_STATUS, 
  TaskStatus, 
} from '@/config/constants';
import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/logger';

export interface Task {
  id: string;
  name: string;
  task_list_id: string | null;
  evidence_type_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  evidence_type?: {
    id: string;
    name: string;
    requires_submission: boolean;
  };
  subtasks?: MasterSubTask[];
}

export interface TaskListMaster {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  tasks?: Task[];
}

export interface ProgramTask {
  id: string;
  program_id: string;
  name: string;
  evidence_type_id: string | null;
  sort_order: number;
  is_active: boolean;
  master_task_id: string | null;
  created_at: string;
  updated_at: string;
  evidence_type?: {
    id: string;
    name: string;
    requires_submission: boolean;
  };
  subtasks?: ProgramSubTask[];
}

export interface ProgramSubTask {
  id: string;
  program_task_id: string;
  name: string;
  sort_order: number;
  master_subtask_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MasterSubTask {
  id: string;
  task_id: string;
  name: string;
  evidence_type_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  evidence_type?: {
    id: string;
    name: string;
    requires_submission: boolean;
  };
}

export interface PairSubTask {
  id: string;
  pair_task_id: string;
  master_subtask_id: string | null;
  name: string;
  evidence_type_id: string | null;
  sort_order: number;
  is_completed: boolean;
  is_custom: boolean;
  completed_by_id: string | null;
  completed_by?: {
    id: string;
    full_name: string | null;
  };
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  evidence_type?: {
    id: string;
    name: string;
    requires_submission: boolean;
  };
}

export interface PairTask {
  id: string;
  pair_id: string;
  program_id: string;
  master_task_id: string | null;
  name: string;
  evidence_type_id: string | null;
  sort_order: number;
  status: TaskStatus;
  last_feedback: string | null;
  evidence_notes: string | null;
  rejection_reason: string | null;
  submitted_at: string | null;
  submitted_by_id: string | null;
  submitted_by?: {
    id: string;
    full_name: string | null;
  };
  completed_at: string | null;
  completed_by_id: string | null;
  completed_by?: {
    id: string;
    full_name: string | null;
  };
  last_reviewed_at: string | null;
  last_reviewed_by_id: string | null;
  last_reviewed_by?: {
    id: string;
    full_name: string | null;
  };
  last_action: string | null;
  created_at: string;
  updated_at: string;
  evidence_type?: {
    id: string;
    name: string;
    requires_submission: boolean;
  };
  subtasks?: PairSubTask[];
  task?: Task;
  pair?: {
    id: string;
    mentor_id: string;
    mentee_id: string;
    program_id: string;
    mentor?: { id: string; full_name: string | null };
    mentee?: { id: string; full_name: string | null };
  };
}

/**
 * Fetch all task lists with their tasks and subtasks
 */
export async function fetchTaskLists(): Promise<TaskListMaster[]> {
  try {
    const { data, error } = await supabase
      .from('mp_task_lists_master')
      .select(`
        *,
        tasks:mp_tasks_master(
          *,
          evidence_type:mp_evidence_types(id, name, requires_submission),
          subtasks:mp_subtasks_master(
            *,
            evidence_type:mp_evidence_types(id, name, requires_submission)
          )
        )
      `)
      .order('created_at', { ascending: false })
      .order('sort_order', { foreignTable: 'tasks', ascending: true })
      .order('sort_order', { foreignTable: 'tasks.subtasks', ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    await logError({
      message: 'Error fetching task lists',
      componentName: 'tasks-api',
      metadata: { error }
    });
    throw error;
  }
}

/**
 * Fetch a specific task list by ID
 */
export async function fetchTaskList(id: string): Promise<TaskListMaster> {
  try {
    const { data, error } = await supabase
      .from('mp_task_lists_master')
      .select(`
        *,
        tasks:mp_tasks_master(
          *,
          evidence_type:mp_evidence_types(id, name, requires_submission),
          subtasks:mp_subtasks_master(
            *,
            evidence_type:mp_evidence_types(id, name, requires_submission)
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    await logError({
      message: 'Error fetching task list',
      componentName: 'tasks-api',
      metadata: { error, id }
    });
    throw error;
  }
}

/**
 * Fetch all tasks for a specific task list
 */
export async function fetchTaskListTasks(taskListId: string): Promise<Task[]> {
  try {
    const { data, error } = await supabase
      .from('mp_tasks_master')
      .select(`
        *,
        evidence_type:mp_evidence_types(id, name, requires_submission),
        subtasks:mp_subtasks_master(
          *,
          evidence_type:mp_evidence_types(id, name, requires_submission)
        )
      `)
      .eq('task_list_id', taskListId)
      .order('sort_order', { ascending: true })
      .order('sort_order', { foreignTable: 'subtasks', ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    await logError({
      message: 'Error fetching task list tasks',
      componentName: 'tasks-api',
      metadata: { error, taskListId }
    });
    throw error;
  }
}

/**
 * Fetch program tasks for a specific program
 */
export async function fetchProgramTasks(programId: string): Promise<ProgramTask[]> {
  try {
    const { data, error } = await supabase
      .from('mp_program_tasks')
      .select(`
        *,
        evidence_type:mp_evidence_types(id, name, requires_submission),
        subtasks:mp_program_subtasks(
          *
        )
      `)
      .eq('program_id', programId)
      .order('sort_order', { ascending: true })
      .order('sort_order', { foreignTable: 'subtasks', ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    await logError({
      message: 'Error fetching program tasks',
      componentName: 'tasks-api',
      metadata: { error, programId }
    });
    throw error;
  }
}

/**
 * Create a new task list
 */
export async function createTaskList(taskList: Omit<TaskListMaster, 'id' | 'created_at' | 'updated_at'>): Promise<TaskListMaster> {
  try {
    const { data, error } = await supabase
      .from('mp_task_lists_master')
      .insert(taskList)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    await logError({
      message: 'Error creating task list',
      componentName: 'tasks-api',
      metadata: { error, taskList }
    });
    throw error;
  }
}

/**
 * Update a task list
 */
export async function updateTaskList(id: string, updates: Partial<TaskListMaster>): Promise<TaskListMaster> {
  try {
    const { data, error } = await supabase
      .from('mp_task_lists_master')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    await logError({
      message: 'Error updating task list',
      componentName: 'tasks-api',
      metadata: { error, id, updates }
    });
    throw error;
  }
}

/**
 * Delete a task list
 */
export async function deleteTaskList(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('mp_task_lists_master')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error: any) {
    await logError({
      message: 'Error deleting task list',
      componentName: 'tasks-api',
      metadata: { error, id }
    });
    throw error;
  }
}

/**
 * Duplicate a task list including all tasks and subtasks
 */
export async function duplicateTaskList(taskListId: string, newName: string): Promise<TaskListMaster> {
  try {
    // 1. Fetch original list
    const originalList = await fetchTaskList(taskListId);
    
    // 2. Create new list
    const newList = await createTaskList({
      name: newName,
      description: originalList.description,
      is_active: originalList.is_active
    });

    // 3. Duplicate tasks and their subtasks
    if (originalList.tasks) {
      for (const task of originalList.tasks) {
        const { id: _originalTaskId, subtasks, evidence_type: _et, ...taskData } = task as any;
        const newTask = await createTask({
          ...taskData,
          task_list_id: newList.id
        });

        if (subtasks) {
          for (const subtask of subtasks) {
            const { id: _originalSubtaskId, evidence_type: _set, ...subtaskData } = subtask as any;
            await createMasterSubTask({
              ...subtaskData,
              task_id: newTask.id
            });
          }
        }
      }
    }

    return fetchTaskList(newList.id);
  } catch (error: any) {
    await logError({
      message: 'Error duplicating task list',
      componentName: 'tasks-api',
      metadata: { error, taskListId, newName }
    });
    throw error;
  }
}

/**
 * Create a new program task
 */
export async function createProgramTask(task: Omit<ProgramTask, 'id' | 'created_at' | 'updated_at'>): Promise<ProgramTask> {
  try {
    const { data, error } = await supabase
      .from('mp_program_tasks')
      .insert(task)
      .select(`
        *,
        evidence_type:mp_evidence_types(id, name, requires_submission)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    await logError({
      message: 'Error creating program task',
      componentName: 'tasks-api',
      metadata: { error, task }
    });
    throw error;
  }
}

/**
 * Update a program task
 */
export async function updateProgramTask(taskId: string, updates: Partial<ProgramTask>): Promise<ProgramTask> {
  try {
    const { data, error } = await supabase
      .from('mp_program_tasks')
      .update(updates)
      .eq('id', taskId)
      .select(`
        *,
        evidence_type:mp_evidence_types(id, name, requires_submission)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    await logError({
      message: 'Error updating program task',
      componentName: 'tasks-api',
      metadata: { error, taskId, updates }
    });
    throw error;
  }
}

/**
 * Delete a program task
 */
export async function deleteProgramTask(taskId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('mp_program_tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;
  } catch (error: any) {
    await logError({
      message: 'Error deleting program task',
      componentName: 'tasks-api',
      metadata: { error, taskId }
    });
    throw error;
  }
}

/**
 * Create a new program subtask
 */
export async function createProgramSubTask(subtask: Omit<ProgramSubTask, 'id' | 'created_at' | 'updated_at'>): Promise<ProgramSubTask> {
  try {
    const { data, error } = await supabase
      .from('mp_program_subtasks')
      .insert(subtask)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    await logError({
      message: 'Error creating program subtask',
      componentName: 'tasks-api',
      metadata: { error, subtask }
    });
    throw error;
  }
}

/**
 * Update a program subtask
 */
export async function updateProgramSubTask(subtaskId: string, updates: Partial<ProgramSubTask>): Promise<ProgramSubTask> {
  try {
    const { data, error } = await supabase
      .from('mp_program_subtasks')
      .update(updates)
      .eq('id', subtaskId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    await logError({
      message: 'Error updating program subtask',
      componentName: 'tasks-api',
      metadata: { error, subtaskId, updates }
    });
    throw error;
  }
}

/**
 * Delete a program subtask
 */
export async function deleteProgramSubTask(subtaskId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('mp_program_subtasks')
      .delete()
      .eq('id', subtaskId);

    if (error) throw error;
  } catch (error: any) {
    await logError({
      message: 'Error deleting program subtask',
      componentName: 'tasks-api',
      metadata: { error, subtaskId }
    });
    throw error;
  }
}

/**
 * Fetch all available evidence types
 */
export async function fetchEvidenceTypes(): Promise<{ id: string; name: string; requires_submission: boolean }[]> {
  try {
    const { data, error } = await supabase
      .from('mp_evidence_types')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    await logError({
      message: 'Error fetching evidence types',
      componentName: 'tasks-api',
      metadata: { error }
    });
    throw error;
  }
}

/**
 * Fetch all tasks (can be filtered by organization/list)
 */
export async function fetchTasks(taskListId?: string): Promise<Task[]> {
  try {
    let query = supabase
      .from('mp_tasks_master')
      .select(`
        *,
        evidence_type:mp_evidence_types(id, name, requires_submission)
      `);

    if (taskListId) {
      query = query.eq('task_list_id', taskListId);
    }

    const { data, error } = await query.order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    await logError({
      message: 'Error fetching tasks',
      componentName: 'tasks-api',
      metadata: { error, taskListId }
    });
    throw error;
  }
}

/**
 * Fetch tasks for a specific pair
 */
export async function fetchPairTasks(pairId: string, includeInactive = false): Promise<PairTask[]> {
  try {
    const { data, error } = await supabase
      .from('mp_pair_tasks')
      .select(`
        id,
        pair_id,
        master_task_id,
        name,
        evidence_type_id,
        sort_order,
        status,
        last_feedback,
        evidence_notes,
        rejection_reason,
        submitted_at,
        submitted_by_id,
        submitted_by:mp_profiles!submitted_by_id(id, full_name),
        completed_at,
        completed_by_id:completed_by_user_id,
        completed_by:mp_profiles!completed_by_user_id(id, full_name),
        last_reviewed_at,
        last_reviewed_by_id,
        last_reviewed_by:mp_profiles!last_reviewed_by_id(id, full_name),
        last_action,
        created_at,
        updated_at,
        pair:mp_pairs!inner(
          id,
          mentor_id,
          mentee_id,
          program_id,
          mentor:mentor_id(id, full_name),
          mentee:mentee_id(id, full_name)
        ),
        task:mp_tasks_master(
          id,
          name,
          evidence_type_id,
          sort_order,
          is_active,
          evidence_type:mp_evidence_types(id, name, requires_submission)
        ),
        program_task:mp_program_tasks(
          id,
          name,
          evidence_type_id,
          sort_order,
          is_active,
          evidence_type:mp_evidence_types(id, name, requires_submission)
        ),
        evidence_type:mp_evidence_types(id, name, requires_submission),
        subtasks:mp_pair_subtasks(
          id,
          pair_task_id,
          master_subtask_id,
          name,
          evidence_type_id,
          sort_order,
          is_completed,
          is_custom,
          completed_by_id,
          completed_by:mp_profiles!completed_by_id(id, full_name),
          completed_at,
          created_at,
          updated_at,
          evidence_type:mp_evidence_types(id, name, requires_submission)
        )
      `)
      .eq('pair_id', pairId)
      .order('sort_order', { ascending: true })
      .order('sort_order', { foreignTable: 'mp_pair_subtasks', ascending: true });

    if (error) throw error;

    return (data || []).map((t: any) => ({
      ...t,
      submitted_by: Array.isArray(t.submitted_by) ? t.submitted_by[0] : t.submitted_by,
      completed_by: Array.isArray(t.completed_by) ? t.completed_by[0] : t.completed_by,
      last_reviewed_by: Array.isArray(t.last_reviewed_by) ? t.last_reviewed_by[0] : t.last_reviewed_by,
      subtasks: t.subtasks?.map((st: any) => ({
        ...st,
        completed_by: Array.isArray(st.completed_by) ? st.completed_by[0] : st.completed_by
      }))
    })) as PairTask[];
  } catch (error: any) {
    await logError({
      message: 'Error fetching pair tasks',
      componentName: 'tasks-api',
      metadata: { error, pairId }
    });
    throw error;
  }
}

/**
 * Reorder pair tasks in batch
 */
export async function reorderPairTasks(tasks: { id: string; sort_order: number }[]): Promise<void> {
  try {
    const { error } = await supabase
      .from('mp_pair_tasks')
      .upsert(tasks, { onConflict: 'id' });

    if (error) throw error;
  } catch (error: any) {
    await logError({
      message: 'Error reordering pair tasks',
      componentName: 'tasks-api',
      metadata: { error }
    });
    throw error;
  }
}

/**
 * Reorder master tasks in batch
 */
export async function reorderMasterTasks(tasks: { id: string; sort_order: number }[]): Promise<void> {
  try {
    const { error } = await supabase
      .from('mp_tasks_master')
      .upsert(tasks, { onConflict: 'id' });

    if (error) throw error;
  } catch (error: any) {
    await logError({
      message: 'Error reordering master tasks',
      componentName: 'tasks-api',
      metadata: { error }
    });
    throw error;
  }
}

/**
 * Update pair task status
 */
export async function updatePairTaskStatus(
  taskId: string,
  status: TaskStatus | 'revision_required',
  userId?: string,
  evidenceNotes?: string
): Promise<PairTask> {
  try {
    const updateData: any = { status };
    
    if (evidenceNotes !== undefined) {
      updateData.evidence_notes = evidenceNotes;
    }
    
    if (status === TASK_STATUS.AWAITING_REVIEW) {
      updateData.submitted_at = new Date().toISOString();
      updateData.last_action = 'submitted';
      if (userId) {
        updateData.submitted_by_id = userId;
      }
    }

    if (status === TASK_STATUS.COMPLETED || status === 'revision_required') {
      updateData.last_reviewed_at = new Date().toISOString();
      updateData.last_action = status === TASK_STATUS.COMPLETED ? 'approved' : 'rejected';
      if (userId) {
        updateData.last_reviewed_by_id = userId;
      }
    }

    if (status === TASK_STATUS.COMPLETED) {
      updateData.completed_at = new Date().toISOString();
      if (userId) {
        updateData.completed_by_user_id = userId;
      }
    } else if (status !== TASK_STATUS.AWAITING_REVIEW && status !== 'revision_required') {
      // If we are moving back to not_submitted, clear metadata
      updateData.completed_at = null;
      updateData.completed_by_user_id = null;
      updateData.submitted_at = null;
      updateData.submitted_by_id = null;
      updateData.last_action = null;
    }

    if (status === TASK_STATUS.AWAITING_REVIEW || status === TASK_STATUS.COMPLETED) {
      updateData.last_feedback = null;
    }

    const { data, error } = await supabase
      .from('mp_pair_tasks')
      .update(updateData)
      .eq('id', taskId)
      .select(`
        id,
        pair_id,
        master_task_id,
        name,
        evidence_type_id,
        sort_order,
        status,
        last_feedback,
        evidence_notes,
        rejection_reason,
        submitted_at,
        submitted_by_id,
        submitted_by:mp_profiles!submitted_by_id(id, full_name),
        completed_at,
        completed_by_id:completed_by_user_id,
        completed_by:mp_profiles!completed_by_user_id(id, full_name),
        last_reviewed_at,
        last_reviewed_by_id,
        last_reviewed_by:mp_profiles!last_reviewed_by_id(id, full_name),
        last_action,
        created_at,
        updated_at,
        evidence_type:mp_evidence_types(id, name, requires_submission)
      `)
      .single();

    if (error) throw error;

    const task = data as any;
    return {
      ...task,
      submitted_by: Array.isArray(task.submitted_by) ? task.submitted_by[0] : task.submitted_by,
      completed_by: Array.isArray(task.completed_by) ? task.completed_by[0] : task.completed_by,
      last_reviewed_by: Array.isArray(task.last_reviewed_by) ? task.last_reviewed_by[0] : task.last_reviewed_by
    } as PairTask;
  } catch (error: any) {
    await logError({
      message: 'Error updating pair task status',
      componentName: 'tasks-api',
      metadata: { error, taskId, status }
    });
    throw error;
  }
}

/**
 * Fetch status of all tasks for all pairs (optionally filtered by program)
 */
export async function fetchAllPairTaskStatuses(programId?: string): Promise<{ pair_id: string; status: string }[]> {
  if (programId && (typeof programId !== 'string' || programId === '[object Object]')) {
    console.warn('fetchAllPairTaskStatuses called with invalid programId:', programId);
    return [];
  }

  try {
    let query = supabase
      .from('mp_pair_tasks')
      .select('pair_id, status');

    if (programId) {
      query = query.eq('program_id', programId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    await logError({
      message: 'Error fetching all pair task statuses',
      componentName: 'tasks-api',
      metadata: { error, programId }
    });
    throw error;
  }
}

/**
 * Toggle task active status
 */
export async function toggleTaskActive(taskId: string, isActive: boolean): Promise<Task> {
  try {
    const { data, error } = await supabase
      .from('mp_tasks_master')
      .update({ is_active: isActive })
      .eq('id', taskId)
      .select(`
        *,
        evidence_type:mp_evidence_types(id, name, requires_submission)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    await logError({
      message: 'Error toggling task active status',
      componentName: 'tasks-api',
      metadata: { error, taskId, isActive }
    });
    throw error;
  }
}

/**
 * Create a new task in the master list
 */
export async function createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> {
  try {
    const { data, error } = await supabase
      .from('mp_tasks_master')
      .insert(task)
      .select(`
        *,
        evidence_type:mp_evidence_types(id, name, requires_submission)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    await logError({
      message: 'Error creating master task',
      componentName: 'tasks-api',
      metadata: { error, task }
    });
    throw error;
  }
}

/**
 * Update an existing task in the master list
 */
export async function updateTask(taskId: string, updates: Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>>): Promise<Task> {
  try {
    const { data, error } = await supabase
      .from('mp_tasks_master')
      .update(updates)
      .eq('id', taskId)
      .select(`
        *,
        evidence_type:mp_evidence_types(id, name, requires_submission)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    await logError({
      message: 'Error updating master task',
      componentName: 'tasks-api',
      metadata: { error, taskId, updates }
    });
    throw error;
  }
}

/**
 * Delete a master task
 */
export async function deleteTask(taskId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('mp_tasks_master')
      .delete()
      .eq('id', taskId);

    if (error) throw error;
  } catch (error: any) {
    await logError({
      message: 'Error deleting master task',
      componentName: 'tasks-api',
      metadata: { error, taskId }
    });
    throw error;
  }
}

/**
 * Fetch master subtasks for a task
 */
export async function fetchMasterSubTasks(taskId: string): Promise<MasterSubTask[]> {
  try {
    const { data, error } = await supabase
      .from('mp_subtasks_master')
      .select(`
        *,
        evidence_type:mp_evidence_types(id, name, requires_submission)
      `)
      .eq('task_id', taskId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    await logError({
      message: 'Error fetching master subtasks',
      componentName: 'tasks-api',
      metadata: { error, taskId }
    });
    throw error;
  }
}

/**
 * Create a new master subtask
 */
export async function createMasterSubTask(subtask: Omit<MasterSubTask, 'id' | 'created_at' | 'updated_at'>): Promise<MasterSubTask> {
  try {
    const { data, error } = await supabase
      .from('mp_subtasks_master')
      .insert(subtask)
      .select(`
        *,
        evidence_type:mp_evidence_types(id, name, requires_submission)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    await logError({
      message: 'Error creating master subtask',
      componentName: 'tasks-api',
      metadata: { error, subtask }
    });
    throw error;
  }
}

/**
 * Update a master subtask
 */
export async function updateMasterSubTask(subtaskId: string, updates: Partial<Omit<MasterSubTask, 'id' | 'created_at' | 'updated_at'>>): Promise<MasterSubTask> {
  try {
    const { data, error } = await supabase
      .from('mp_subtasks_master')
      .update(updates)
      .eq('id', subtaskId)
      .select(`
        *,
        evidence_type:mp_evidence_types(id, name, requires_submission)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    await logError({
      message: 'Error updating master subtask',
      componentName: 'tasks-api',
      metadata: { error, subtaskId, updates }
    });
    throw error;
  }
}

/**
 * Delete a master subtask
 */
export async function deleteMasterSubTask(subtaskId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('mp_subtasks_master')
      .delete()
      .eq('id', subtaskId);

    if (error) throw error;
  } catch (error: any) {
    await logError({
      message: 'Error deleting master subtask',
      componentName: 'tasks-api',
      metadata: { error, subtaskId }
    });
    throw error;
  }
}

/**
 * Create a new task for a pair
 */
export async function createPairTask(task: Omit<PairTask, 'id' | 'created_at' | 'updated_at' | 'task' | 'subtasks' | 'evidence_type'>): Promise<PairTask> {
  try {
    const { data: pair, error: pairError } = await supabase
      .from('mp_pairs')
      .select('program_id')
      .eq('id', task.pair_id)
      .single();

    if (pairError || !pair) {
      throw new Error('Could not verify pairing context for task creation.');
    }

    const { data, error } = await supabase
      .from('mp_pair_tasks')
      .insert({
        ...task,
        program_id: pair.program_id
      })
      .select(`
        *,
        evidence_type:mp_evidence_types(id, name, requires_submission)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    await logError({
      message: 'Error creating pair task',
      componentName: 'tasks-api',
      metadata: { error, task }
    });
    throw error;
  }
}

/**
 * Update an existing task for a pair
 */
export async function updatePairTask(taskId: string, updates: Partial<PairTask>): Promise<PairTask> {
  try {
    const { id: _id, pair_id: _pair_id, created_at: _created_at, updated_at: _updated_at, task: _task, subtasks: _subtasks, evidence_type: _evidence_type, ...cleanUpdates } = updates as any;

    const { data, error } = await supabase
      .from('mp_pair_tasks')
      .update(cleanUpdates)
      .eq('id', taskId)
      .select(`
        *,
        evidence_type:mp_evidence_types(id, name, requires_submission)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    await logError({
      message: 'Error updating pair task',
      componentName: 'tasks-api',
      metadata: { error, taskId, updates }
    });
    throw error;
  }
}

/**
 * Delete a pair task
 */
export async function deletePairTask(taskId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('mp_pair_tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;
  } catch (error: any) {
    await logError({
      message: 'Error deleting pair task',
      componentName: 'tasks-api',
      metadata: { error, taskId }
    });
    throw error;
  }
}

/**
 * Create a new subtask for a pair task
 */
export async function createPairSubTask(subtask: Omit<PairSubTask, 'id' | 'created_at' | 'updated_at' | 'evidence_type'>): Promise<PairSubTask> {
  try {
    const { data, error } = await supabase
      .from('mp_pair_subtasks')
      .insert(subtask)
      .select(`
        *,
        evidence_type:mp_evidence_types(id, name, requires_submission)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    await logError({
      message: 'Error creating pair subtask',
      componentName: 'tasks-api',
      metadata: { error, subtask }
    });
    throw error;
  }
}

/**
 * Update a pair subtask
 */
export async function updatePairSubTask(subtaskId: string, updates: Partial<PairSubTask>): Promise<PairSubTask> {
  try {
    const { id: _id, created_at: _created_at, updated_at: _updated_at, evidence_type: _evidence_type, ...cleanUpdates } = updates as any;

    const { data, error } = await supabase
      .from('mp_pair_subtasks')
      .update(cleanUpdates)
      .eq('id', subtaskId)
      .select(`
        *,
        evidence_type:mp_evidence_types(id, name, requires_submission)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    await logError({
      message: 'Error updating pair subtask',
      componentName: 'tasks-api',
      metadata: { error, subtaskId, updates }
    });
    throw error;
  }
}

/**
 * Delete a pair subtask
 */
export async function deletePairSubTask(subtaskId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('mp_pair_subtasks')
      .delete()
      .eq('id', subtaskId);

    if (error) throw error;
  } catch (error: any) {
    await logError({
      message: 'Error deleting pair subtask',
      componentName: 'tasks-api',
      metadata: { error, subtaskId }
    });
    throw error;
  }
}

/**
 * Toggle pair subtask completion status
 */
export async function togglePairSubTaskCompletion(
  subtaskId: string,
  isCompleted: boolean,
  userId?: string
): Promise<PairSubTask> {
  try {
    const updateData: any = { 
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null,
      completed_by_id: isCompleted && userId ? userId : null
    };

    const { data, error } = await supabase
      .from('mp_pair_subtasks')
      .update(updateData)
      .eq('id', subtaskId)
      .select(`
        *,
        completed_by:mp_profiles!completed_by_id(id, full_name),
        evidence_type:mp_evidence_types(id, name, requires_submission)
      `)
      .single();

    if (error) throw error;

    const subtask = data as any;
    return {
      ...subtask,
      completed_by: Array.isArray(subtask.completed_by) ? subtask.completed_by[0] : subtask.completed_by
    } as PairSubTask;
  } catch (error: any) {
    await logError({
      message: 'Error toggling pair subtask completion',
      componentName: 'tasks-api',
      metadata: { error, subtaskId, isCompleted }
    });
    throw error;
  }
}

/**
 * Fetch pair subtasks for a pair task
 */
export async function fetchPairSubTasks(pairTaskId: string): Promise<PairSubTask[]> {
  try {
    const { data, error } = await supabase
      .from('mp_pair_subtasks')
      .select(`
        *,
        completed_by:mp_profiles!completed_by_id(id, full_name),
        evidence_type:mp_evidence_types(id, name, requires_submission)
      `)
      .eq('pair_task_id', pairTaskId)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return (data || []).map((st: any) => ({
      ...st,
      completed_by: Array.isArray(st.completed_by) ? st.completed_by[0] : st.completed_by
    })) as PairSubTask[];
  } catch (error: any) {
    await logError({
      message: 'Error fetching pair subtasks',
      componentName: 'tasks-api',
      metadata: { error, pairTaskId }
    });
    throw error;
  }
}
