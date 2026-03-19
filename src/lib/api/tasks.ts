import { 
  TASK_STATUS, 
  TaskStatus, 
} from '@/config/constants';
import { supabase } from '@/lib/supabase';

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
  master_task_id: string | null;
  program_task_id: string | null;
  name: string;
  evidence_type_id: string | null;
  sort_order: number;
  status: TaskStatus | 'revision_required';
  is_custom: boolean;
  last_feedback?: string | null;
  evidence_notes?: string | null;
  rejection_reason?: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  completed_by_id: string | null;
  completed_by?: {
    id: string;
    full_name: string | null;
  };
  created_at: string;
  updated_at: string;
  task?: Task;
  program_task?: ProgramTask;
  subtasks?: PairSubTask[];
  evidence_type?: {
    id: string;
    name: string;
    requires_submission: boolean;
  };
}

export interface EvidenceType {
  id: string;
  name: string;
  requires_submission: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all task lists in the instance
 */
export async function fetchTaskLists(): Promise<TaskListMaster[]> {
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

  if (error) {
    console.error('Error fetching task lists:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch tasks for a specific task list
 */
export async function fetchTaskListTasks(taskListId: string): Promise<Task[]> {
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

  if (error) {
    console.error('Error fetching task list tasks:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch program tasks for a specific program
 */
export async function fetchProgramTasks(programId: string): Promise<ProgramTask[]> {
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

  if (error) {
    console.error('Error fetching program tasks:', error);
    throw error;
  }

  return data || [];
}

/**
 * Create a new task list
 */
export async function createTaskList(taskList: Omit<TaskListMaster, 'id' | 'created_at' | 'updated_at'>): Promise<TaskListMaster> {
  const { data, error } = await supabase
    .from('mp_task_lists_master')
    .insert(taskList)
    .select()
    .single();

  if (error) {
    console.error('Error creating task list:', error);
    throw error;
  }

  return data;
}

/**
 * Update a task list
 */
export async function updateTaskList(taskListId: string, updates: Partial<TaskListMaster>): Promise<TaskListMaster> {
  const { id: _id, created_at: _ca, updated_at: _ua, ...cleanUpdates } = updates as any;

  const { data, error } = await supabase
    .from('mp_task_lists_master')
    .update(cleanUpdates)
    .eq('id', taskListId)
    .select()
    .single();

  if (error) {
    console.error('Error updating task list:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a task list
 */
export async function deleteTaskList(taskListId: string): Promise<void> {
  const { error } = await supabase
    .from('mp_task_lists_master')
    .delete()
    .eq('id', taskListId);

  if (error) {
    console.error('Error deleting task list:', error);
    throw error;
  }
}

/**
 * Duplicate a task list and all its tasks/subtasks
 */
export async function duplicateTaskList(sourceId: string, newName: string): Promise<TaskListMaster> {
  const { data: sourceList, error: fetchError } = await supabase
    .from('mp_task_lists_master')
    .select(`
      *,
      tasks:mp_tasks_master(
        *,
        subtasks:mp_subtasks_master(*)
      )
    `)
    .eq('id', sourceId)
    .single();

  if (fetchError) throw fetchError;

  const newList = await createTaskList({
    name: newName,
    description: sourceList.description,
    is_active: sourceList.is_active
  });

  if (sourceList.tasks && sourceList.tasks.length > 0) {
    const sortedTasks = [...sourceList.tasks].sort((a, b) => a.sort_order - b.sort_order);
    
    for (const task of sortedTasks) {
      const { id: _, created_at: _ca, updated_at: _ua, subtasks, evidence_type: _et, ...taskData } = task;
      const newTask = await createTask({
        ...taskData,
        task_list_id: newList.id
      });

      if (subtasks && subtasks.length > 0) {
        const sortedSubtasks = [...subtasks].sort((a, b) => a.sort_order - b.sort_order);
        
        for (const subtask of sortedSubtasks) {
          const { id: _sid, created_at: _sca, updated_at: _sua, evidence_type: _set, ...subtaskData } = subtask;
          await createMasterSubTask({
            ...subtaskData,
            task_id: newTask.id
          });
        }
      }
    }
  }

  return newList;
}

/**
 * Create a program task
 */
export async function createProgramTask(task: Omit<ProgramTask, 'id' | 'created_at' | 'updated_at'>): Promise<ProgramTask> {
  const { data, error } = await supabase
    .from('mp_program_tasks')
    .insert(task)
    .select(`
      *,
      evidence_type:mp_evidence_types(id, name, requires_submission)
    `)
    .single();

  if (error) {
    console.error('Error creating program task:', error);
    throw error;
  }

  return data;
}

/**
 * Update a program task
 */
export async function updateProgramTask(taskId: string, updates: Partial<ProgramTask>): Promise<ProgramTask> {
  const { id: _id, program_id: _program_id, created_at: _created_at, updated_at: _updated_at, ...cleanUpdates } = updates as any;

  const { data, error } = await supabase
    .from('mp_program_tasks')
    .update(cleanUpdates)
    .eq('id', taskId)
    .select(`
      *,
      evidence_type:mp_evidence_types(id, name, requires_submission)
    `)
    .single();

  if (error) {
    console.error('Error updating program task:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a program task
 */
export async function deleteProgramTask(taskId: string): Promise<void> {
  const { error } = await supabase
    .from('mp_program_tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error('Error deleting program task:', error);
    throw error;
  }
}

/**
 * Create a program subtask
 */
export async function createProgramSubTask(subtask: Omit<ProgramSubTask, 'id' | 'created_at' | 'updated_at'>): Promise<ProgramSubTask> {
  const { data, error } = await supabase
    .from('mp_program_subtasks')
    .insert(subtask)
    .select()
    .single();

  if (error) {
    console.error('Error creating program subtask:', error);
    throw error;
  }

  return data;
}

/**
 * Update a program subtask
 */
export async function updateProgramSubTask(subtaskId: string, updates: Partial<ProgramSubTask>): Promise<ProgramSubTask> {
  const { id: _id, created_at: _created_at, updated_at: _updated_at, ...cleanUpdates } = updates as any;

  const { data, error } = await supabase
    .from('mp_program_subtasks')
    .update(cleanUpdates)
    .eq('id', subtaskId)
    .select()
    .single();

  if (error) {
    console.error('Error updating program subtask:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a program subtask
 */
export async function deleteProgramSubTask(subtaskId: string): Promise<void> {
  const { error } = await supabase
    .from('mp_program_subtasks')
    .delete()
    .eq('id', subtaskId);

  if (error) {
    console.error('Error deleting program subtask:', error);
    throw error;
  }
}

/**
 * Fetch all available evidence types
 */
export async function fetchEvidenceTypes(): Promise<EvidenceType[]> {
  const { data, error } = await supabase
    .from('mp_evidence_types')
    .select('*')
    .order('name', { ascending: true })
    .limit(100);

  if (error) {
    console.error('Error fetching evidence types:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch all tasks in the instance
 */
export async function fetchTasks(includeInactive: boolean = false): Promise<Task[]> {
  const query = supabase
    .from('mp_tasks_master')
    .select(`
      *,
      evidence_type:mp_evidence_types(id, name, requires_submission),
      subtasks:mp_subtasks_master(
        *,
        evidence_type:mp_evidence_types(id, name, requires_submission)
      )
    `);

  if (!includeInactive) {
    query.eq('is_active', true);
  }

  const { data, error } = await query.order('sort_order', { ascending: true }).limit(500);

  if (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch tasks for a specific pair
 */
export async function fetchPairTasks(pairId: string): Promise<PairTask[]> {
  const { data, error } = await supabase
    .from('mp_pair_tasks')
    .select(`
      id,
      pair_id,
      master_task_id,
      program_task_id,
      name,
      evidence_type_id,
      sort_order,
      status,
      is_custom,
      last_feedback,
      evidence_notes,
      rejection_reason,
      submitted_at,
      completed_at,
      completed_by_id:completed_by_user_id,
      completed_by:mp_profiles!completed_by_user_id(id, full_name),
      created_at,
      updated_at,
      pair:mp_pairs!inner(
        id,
        mentor_id,
        mentee_id,
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
        completed_at,
        created_at,
        updated_at,
        evidence_type:mp_evidence_types(id, name, requires_submission)
      )
    `)
    .eq('pair_id', pairId)
    .order('sort_order', { ascending: true })
    .order('sort_order', { foreignTable: 'mp_pair_subtasks', ascending: true });

  if (error) {
    console.error('Error fetching pair tasks:', error);
    throw error;
  }

  return (data || []).map((t: any) => ({
    ...t,
    completed_by: Array.isArray(t.completed_by) ? t.completed_by[0] : t.completed_by
  })) as PairTask[];
}

/**
 * Reorder pair tasks in batch
 */
export async function reorderPairTasks(tasks: { id: string; sort_order: number }[]): Promise<void> {
  const { error } = await supabase
    .from('mp_pair_tasks')
    .upsert(tasks, { onConflict: 'id' });

  if (error) {
    console.error('Error reordering pair tasks:', error);
    throw error;
  }
}

/**
 * Reorder master tasks in batch
 */
export async function reorderMasterTasks(tasks: { id: string; sort_order: number }[]): Promise<void> {
  const { error } = await supabase
    .from('mp_tasks_master')
    .upsert(tasks, { onConflict: 'id' });

  if (error) {
    console.error('Error reordering master tasks:', error);
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
  const updateData: any = { status };
  
  if (evidenceNotes !== undefined) {
    updateData.evidence_notes = evidenceNotes;
  }
  
  if (status === TASK_STATUS.AWAITING_REVIEW) {
    updateData.submitted_at = new Date().toISOString();
  }

  if (status === TASK_STATUS.COMPLETED) {
    updateData.completed_at = new Date().toISOString();
    if (userId) {
      updateData.completed_by_user_id = userId;
    }
  } else {
    updateData.completed_at = null;
    updateData.completed_by_user_id = null;
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
      completed_at,
      completed_by_id:completed_by_user_id,
      completed_by:mp_profiles!completed_by_user_id(id, full_name),
      created_at,
      updated_at,
      evidence_type:mp_evidence_types(id, name, requires_submission)
    `)
    .single();

  if (error) {
    console.error('Error updating pair task status:', error);
    throw error;
  }

  const task = data as any;
  return {
    ...task,
    completed_by: Array.isArray(task.completed_by) ? task.completed_by[0] : task.completed_by
  } as PairTask;
}

/**
 * Fetch status of all tasks for all pairs (optionally filtered by program)
 */
export async function fetchAllPairTaskStatuses(programId?: string): Promise<{ pair_id: string; status: string }[]> {
  if (programId && (typeof programId !== 'string' || programId === '[object Object]')) {
    console.warn('fetchAllPairTaskStatuses called with invalid programId:', programId);
    return [];
  }

  let query = supabase
    .from('mp_pair_tasks')
    .select('pair_id, status');

  if (programId) {
    query = query.eq('program_id', programId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching all pair task statuses:', error);
    throw error;
  }

  return data || [];
}

/**
 * Toggle task active status
 */
export async function toggleTaskActive(taskId: string, isActive: boolean): Promise<Task> {
  const { data, error } = await supabase
    .from('mp_tasks_master')
    .update({ is_active: isActive })
    .eq('id', taskId)
    .select(`
      *,
      evidence_type:mp_evidence_types(id, name, requires_submission)
    `)
    .single();

  if (error) {
    console.error('Error toggling task active status:', error);
    throw error;
  }

  return data;
}

/**
 * Create a new task in the master list
 */
export async function createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> {
  const { data, error } = await supabase
    .from('mp_tasks_master')
    .insert(task)
    .select(`
      *,
      evidence_type:mp_evidence_types(id, name, requires_submission)
    `)
    .single();

  if (error) {
    console.error('Error creating task:', error);
    throw error;
  }

  return data;
}

/**
 * Update an existing task in the master list
 */
export async function updateTask(taskId: string, updates: Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>>): Promise<Task> {
  const { data, error } = await supabase
    .from('mp_tasks_master')
    .update(updates)
    .eq('id', taskId)
    .select(`
      *,
      evidence_type:mp_evidence_types(id, name, requires_submission)
    `)
    .single();

  if (error) {
    console.error('Error updating task:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a master task
 */
export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase
    .from('mp_tasks_master')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
}

/**
 * Fetch master subtasks for a task
 */
export async function fetchMasterSubTasks(taskId: string): Promise<MasterSubTask[]> {
  const { data, error } = await supabase
    .from('mp_subtasks_master')
    .select(`
      *,
      evidence_type:mp_evidence_types(id, name, requires_submission)
    `)
    .eq('task_id', taskId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching master subtasks:', error);
    throw error;
  }

  return data || [];
}

/**
 * Create a new master subtask
 */
export async function createMasterSubTask(subtask: Omit<MasterSubTask, 'id' | 'created_at' | 'updated_at'>): Promise<MasterSubTask> {
  const { data, error } = await supabase
    .from('mp_subtasks_master')
    .insert(subtask)
    .select(`
      *,
      evidence_type:mp_evidence_types(id, name, requires_submission)
    `)
    .single();

  if (error) {
    console.error('Error creating master subtask:', error);
    throw error;
  }

  return data;
}

/**
 * Update a master subtask
 */
export async function updateMasterSubTask(subtaskId: string, updates: Partial<Omit<MasterSubTask, 'id' | 'created_at' | 'updated_at'>>): Promise<MasterSubTask> {
  const { data, error } = await supabase
    .from('mp_subtasks_master')
    .update(updates)
    .eq('id', subtaskId)
    .select(`
      *,
      evidence_type:mp_evidence_types(id, name, requires_submission)
    `)
    .single();

  if (error) {
    console.error('Error updating master subtask:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a master subtask
 */
export async function deleteMasterSubTask(subtaskId: string): Promise<void> {
  const { error } = await supabase
    .from('mp_subtasks_master')
    .delete()
    .eq('id', subtaskId);

  if (error) {
    console.error('Error deleting master subtask:', error);
    throw error;
  }
}

/**
 * Create a new task for a pair
 */
export async function createPairTask(task: Omit<PairTask, 'id' | 'created_at' | 'updated_at' | 'task' | 'subtasks' | 'evidence_type'>): Promise<PairTask> {
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

  if (error) {
    console.error('Error creating pair task:', error);
    throw error;
  }

  return data;
}

/**
 * Update an existing task for a pair
 */
export async function updatePairTask(taskId: string, updates: Partial<PairTask>): Promise<PairTask> {
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

  if (error) {
    console.error('Error updating pair task:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a pair task
 */
export async function deletePairTask(taskId: string): Promise<void> {
  const { error } = await supabase
    .from('mp_pair_tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error('Error deleting pair task:', error);
    throw error;
  }
}

/**
 * Create a new subtask for a pair task
 */
export async function createPairSubTask(subtask: Omit<PairSubTask, 'id' | 'created_at' | 'updated_at' | 'evidence_type'>): Promise<PairSubTask> {
  const { data, error } = await supabase
    .from('mp_pair_subtasks')
    .insert(subtask)
    .select(`
      *,
      evidence_type:mp_evidence_types(id, name, requires_submission)
    `)
    .single();

  if (error) {
    console.error('Error creating pair subtask:', error);
    throw error;
  }

  return data;
}

/**
 * Update a pair subtask
 */
export async function updatePairSubTask(subtaskId: string, updates: Partial<PairSubTask>): Promise<PairSubTask> {
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

  if (error) {
    console.error('Error updating pair subtask:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a pair subtask
 */
export async function deletePairSubTask(subtaskId: string): Promise<void> {
  const { error } = await supabase
    .from('mp_pair_subtasks')
    .delete()
    .eq('id', subtaskId);

  if (error) {
    console.error('Error deleting pair subtask:', error);
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
      evidence_type:mp_evidence_types(id, name, requires_submission)
    `)
    .single();

  if (error) {
    console.error('Error toggling pair subtask completion:', error);
    throw error;
  }

  return data;
}

/**
 * Fetch pair subtasks for a pair task
 */
export async function fetchPairSubTasks(pairTaskId: string): Promise<PairSubTask[]> {
  const { data, error } = await supabase
    .from('mp_pair_subtasks')
    .select(`
      *,
      evidence_type:mp_evidence_types(id, name, requires_submission)
    `)
    .eq('pair_task_id', pairTaskId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching pair subtasks:', error);
    throw error;
  }

  return data || [];
}
