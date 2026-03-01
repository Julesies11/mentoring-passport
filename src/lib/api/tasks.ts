import { supabase } from '@/lib/supabase';

export interface Task {
  id: string;
  name: string;
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
  master_subtask_id: string;
  name: string;
  evidence_type_id: string | null;
  sort_order: number;
  is_completed: boolean;
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
  master_task_id: string;
  name: string;
  evidence_type_id: string;
  sort_order: number;
  status: 'not_submitted' | 'awaiting_review' | 'completed';
  completed_at: string | null;
  completed_by_id: string | null;
  completed_by?: {
    id: string;
    full_name: string | null;
  };
  created_at: string;

  updated_at: string;
  task?: Task;
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
 * Fetch all available evidence types
 */
export async function fetchEvidenceTypes(): Promise<EvidenceType[]> {
  const { data, error } = await supabase
    .from('mp_evidence_types')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching evidence types:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch all tasks
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

  // Only filter for active tasks unless explicitly requested
  if (!includeInactive) {
    query.eq('is_active', true);
  }

  const { data, error } = await query.order('sort_order', { ascending: true });

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
      name,
      evidence_type_id,
      sort_order,
      status,
      completed_at,
      completed_by_user_id,
      completed_by:mp_profiles!completed_by_user_id(id, full_name),
      created_at,
      updated_at,
      task:mp_tasks_master(
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
        completed_by_id,
        completed_at,
        created_at,
        updated_at,
        evidence_type:mp_evidence_types(id, name, requires_submission)
      )
    `)
    .eq('pair_id', pairId)
    .order('sort_order', { ascending: true })
    .order('sort_order', { referencedTable: 'mp_pair_subtasks', ascending: true });

  if (error) {
    console.error('Error fetching pair tasks:', error);
    throw error;
  }

  return data || [];
}

/**
 * Reorder pair tasks in batch
 */
export async function reorderPairTasks(tasks: { id: string; sort_order: number }[]): Promise<void> {
  // Use a loop of updates instead of upsert to avoid requiring mandatory columns like 'name'
  const promises = tasks.map(task => 
    supabase
      .from('mp_pair_tasks')
      .update({ sort_order: task.sort_order })
      .eq('id', task.id)
  );

  const results = await Promise.all(promises);
  const error = results.find(r => r.error)?.error;

  if (error) {
    console.error('Error reordering pair tasks:', error);
    throw error;
  }
}

/**
 * Reorder master tasks in batch
 */
export async function reorderMasterTasks(tasks: { id: string; sort_order: number }[]): Promise<void> {
  // Use a loop of updates instead of upsert to avoid requiring mandatory columns like 'name'
  const promises = tasks.map(task => 
    supabase
      .from('mp_tasks_master')
      .update({ sort_order: task.sort_order })
      .eq('id', task.id)
  );

  const results = await Promise.all(promises);
  const error = results.find(r => r.error)?.error;

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
  status: 'not_submitted' | 'awaiting_review' | 'completed',
  userId?: string
): Promise<PairTask> {
  // If marking as completed, check if evidence submission is required
  if (status === 'completed') {
    // First, fetch the task with evidence type information
    const { data: taskData, error: taskError } = await supabase
      .from('mp_pair_tasks')
      .select(`
        id,
        pair_id,
        evidence_type_id,
        evidence_type:mp_evidence_types(id, name, requires_submission)
      `)
      .eq('id', taskId)
      .single();

    if (taskError) {
      console.error('Error fetching task for validation:', taskError);
      throw new Error('Failed to fetch task for validation');
    }

    // Check if evidence submission is required
    if (taskData.evidence_type?.requires_submission) {
      // Check if evidence exists for this task
      const { data: evidenceData, error: evidenceError } = await supabase
        .from('mp_evidence_uploads')
        .select('id')
        .eq('task_id', taskId)
        .eq('pair_id', taskData.pair_id)
        .in('status', ['pending', 'approved'])
        .limit(1);

      if (evidenceError) {
        console.error('Error checking evidence submission:', evidenceError);
        throw new Error('Failed to check evidence submission');
      }

      // If evidence is required but doesn't exist, throw an error
      if (!evidenceData || evidenceData.length === 0) {
        throw new Error('Cannot mark task as completed. Evidence submission is required for this task type.');
      }
    }
  }

  const updateData: any = { status };
  
  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
    // Set the user who completed the task
    if (userId) {
      updateData.completed_by_user_id = userId;
    }
  } else {
    // Clear the completed_by_user_id if status is changed from completed
    updateData.completed_by_user_id = null;
  }

  const { error: updateError } = await supabase
    .from('mp_pair_tasks')
    .update(updateData)
    .eq('id', taskId);

  if (updateError) {
    console.error('Error updating pair task status:', updateError);
    throw updateError;
  }

  // Fetch updated data with joins
  const { data, error: fetchError } = await supabase
    .from('mp_pair_tasks')
    .select(`
      id,
      pair_id,
      name,
      evidence_type_id,
      sort_order,
      status,
      completed_at,
      completed_by_user_id,
      completed_by:mp_profiles!completed_by_user_id(id, full_name),
      created_at,
      updated_at,
      evidence_type:mp_evidence_types(id, name, requires_submission)
    `)
    .eq('id', taskId)
    .single();

  if (fetchError) {
    console.error('Error fetching updated pair task:', fetchError);
    throw fetchError;
  }

  return data;
}

/**
 * Get task completion statistics for a pair
 */
export async function fetchPairTaskStats(pairId: string) {
  const { data, error } = await supabase
    .from('mp_pair_tasks')
    .select('status')
    .eq('pair_id', pairId);

  if (error) {
    console.error('Error fetching pair task stats:', error);
    throw error;
  }

  const stats = {
    total: data.length,
    not_submitted: data.filter(t => t.status === 'not_submitted').length,
    awaiting_review: data.filter(t => t.status === 'awaiting_review').length,
    completed: data.filter(t => t.status === 'completed').length,
    completion_percentage: data.length > 0 
      ? Math.round((data.filter(t => t.status === 'completed').length / data.length) * 100)
      : 0,
  };

  return stats;
}

/**
 * Fetch status of all tasks for all pairs
 */
export async function fetchAllPairTaskStatuses(): Promise<{ pair_id: string; status: string }[]> {
  const { data, error } = await supabase
    .from('mp_pair_tasks')
    .select('pair_id, status');

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
  const { data, error } = await supabase
    .from('mp_pair_tasks')
    .insert(task)
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
  // Remove fields that shouldn't be updated directly or are relational
  const { id, pair_id, created_at, updated_at, task, subtasks, evidence_type, ...cleanUpdates } = updates as any;

  const { error: updateError } = await supabase
    .from('mp_pair_tasks')
    .update(cleanUpdates)
    .eq('id', taskId);

  if (updateError) {
    console.error('Error updating pair task:', updateError);
    throw updateError;
  }

  // Fetch updated data with joins
  const { data, error: fetchError } = await supabase
    .from('mp_pair_tasks')
    .select(`
      *,
      evidence_type:mp_evidence_types(id, name, requires_submission)
    `)
    .eq('id', taskId)
    .single();

  if (fetchError) {
    console.error('Error fetching updated pair task:', fetchError);
    throw fetchError;
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
  const { id, created_at, updated_at, evidence_type, ...cleanUpdates } = updates as any;

  const { error: updateError } = await supabase
    .from('mp_pair_subtasks')
    .update(cleanUpdates)
    .eq('id', subtaskId);

  if (updateError) {
    console.error('Error updating pair subtask:', updateError);
    throw updateError;
  }

  // Fetch updated data with joins
  const { data, error: fetchError } = await supabase
    .from('mp_pair_subtasks')
    .select(`
      *,
      evidence_type:mp_evidence_types(id, name, requires_submission)
    `)
    .eq('id', subtaskId)
    .single();

  if (fetchError) {
    console.error('Error fetching updated pair subtask:', fetchError);
    throw fetchError;
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
