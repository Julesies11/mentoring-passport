import { supabase } from '@/lib/supabase';

export interface Pair {
  id: string;
  mentor_id: string;
  mentee_id: string;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
  mentor?: {
    id: string;
    full_name: string | null;
    email: string;
    department: string | null;
    avatar_url: string | null;
  };
  mentee?: {
    id: string;
    full_name: string | null;
    email: string;
    department: string | null;
    avatar_url: string | null;
  };
}

export interface CreatePairInput {
  mentor_id: string;
  mentee_id: string;
}

export interface UpdatePairInput {
  status?: 'active' | 'completed' | 'archived';
}

/**
 * Fetch all pairs with mentor and mentee details
 */
export async function fetchPairs(): Promise<Pair[]> {
  const { data, error } = await supabase
    .from('mp_pairs')
    .select(`
      *,
      mentor:mp_profiles!mentor_id(id, full_name, email, department, avatar_url),
      mentee:mp_profiles!mentee_id(id, full_name, email, department, avatar_url)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pairs:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch a single pair by ID
 */
export async function fetchPair(id: string): Promise<Pair | null> {
  const { data, error } = await supabase
    .from('mp_pairs')
    .select(`
      *,
      mentor:mp_profiles!mentor_id(id, full_name, email, department, avatar_url),
      mentee:mp_profiles!mentee_id(id, full_name, email, department, avatar_url)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching pair:', error);
    throw error;
  }

  return data;
}

/**
 * Create a new mentor-mentee pair
 * Also creates pair_tasks for all existing tasks (moved from database trigger to application layer)
 */
export async function createPair(input: CreatePairInput): Promise<Pair> {
  // Step 1: Fetch the "Not Applicable" evidence type to use as a fallback
  const { data: naEvidenceType } = await supabase
    .from('mp_evidence_types')
    .select('id')
    .or('name.eq.Not Applicable,name.eq.N/A')
    .limit(1)
    .single();

  const fallbackEvidenceTypeId = naEvidenceType?.id;

  // Step 2: Create the pair
  const { data: pair, error: pairError } = await supabase
    .from('mp_pairs')
    .insert(input)
    .select(`
      *,
      mentor:mp_profiles!mentor_id(id, full_name, email, department, avatar_url),
      mentee:mp_profiles!mentee_id(id, full_name, email, department, avatar_url)
    `)
    .single();

  if (pairError) {
    console.error('Error creating pair:', pairError);
    throw pairError;
  }

  // Step 3: Fetch all active tasks from master list
  const { data: tasks, error: tasksError } = await supabase
    .from('mp_tasks_master')
    .select('id, name, evidence_type_id, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (tasksError) {
    console.error('Error fetching tasks:', tasksError);
    throw tasksError;
  }

  // Step 4: Create pair_tasks for this new pair
  if (tasks && tasks.length > 0) {
    const pairTasks = tasks.map(task => ({
      pair_id: pair.id,
      master_task_id: task.id,
      name: task.name,
      evidence_type_id: task.evidence_type_id || fallbackEvidenceTypeId,
      sort_order: task.sort_order,
      status: 'not_submitted' as const,
    }));

    if (pairTasks.some(pt => !pt.evidence_type_id)) {
      throw new Error('Failed to create tasks: One or more tasks are missing a required evidence type and no fallback was found.');
    }

    const { error: pairTasksError } = await supabase
      .from('mp_pair_tasks')
      .insert(pairTasks);

    if (pairTasksError) {
      console.error('Error creating pair tasks:', pairTasksError);
      throw new Error(`Pair created but failed to create tasks: ${pairTasksError.message}`);
    }

    // Step 5: Create pair_subtasks for each pair task
    for (const task of tasks) {
      // Fetch master subtasks for this task
      const { data: masterSubtasks, error: subtasksError } = await supabase
        .from('mp_subtasks_master')
        .select('id, name, evidence_type_id, sort_order')
        .eq('task_id', task.id)
        .order('sort_order', { ascending: true });

      if (subtasksError) {
        console.error('Error fetching master subtasks:', subtasksError);
        continue;
      }

      if (masterSubtasks && masterSubtasks.length > 0) {
        // Get the created pair task ID
        const { data: createdPairTask } = await supabase
          .from('mp_pair_tasks')
          .select('id')
          .eq('pair_id', pair.id)
          .eq('master_task_id', task.id)
          .single();

        if (createdPairTask) {
          const pairSubtasks = masterSubtasks.map(subtask => ({
            pair_task_id: createdPairTask.id,
            master_subtask_id: subtask.id,
            name: subtask.name,
            evidence_type_id: subtask.evidence_type_id || fallbackEvidenceTypeId,
            sort_order: subtask.sort_order,
            is_completed: false,
          }));

          const { error: pairSubtasksError } = await supabase
            .from('mp_pair_subtasks')
            .insert(pairSubtasks);

          if (pairSubtasksError) {
            console.error('Error creating pair subtasks:', pairSubtasksError);
          }
        }
      }
    }
  }

  return pair;
}

/**
 * Update a pair
 */
export async function updatePair(id: string, input: UpdatePairInput): Promise<Pair> {
  const { data, error } = await supabase
    .from('mp_pairs')
    .update(input)
    .eq('id', id)
    .select(`
      *,
      mentor:mp_profiles!mentor_id(id, full_name, email, department, avatar_url),
      mentee:mp_profiles!mentee_id(id, full_name, email, department, avatar_url)
    `)
    .single();

  if (error) {
    console.error('Error updating pair:', error);
    throw error;
  }

  return data;
}

/**
 * Archive a pair
 */
export async function archivePair(id: string): Promise<void> {
  const { error } = await supabase
    .from('mp_pairs')
    .update({ status: 'archived' })
    .eq('id', id);

  if (error) {
    console.error('Error archiving pair:', error);
    throw error;
  }
}

/**
 * Get pair statistics
 */
export async function fetchPairStats() {
  const { data, error } = await supabase
    .from('mp_pairs')
    .select('status');

  if (error) {
    console.error('Error fetching pair stats:', error);
    throw error;
  }

  const stats = {
    total: data.length,
    active: data.filter(p => p.status === 'active').length,
    completed: data.filter(p => p.status === 'completed').length,
    archived: data.filter(p => p.status === 'archived').length,
  };

  return stats;
}

/**
 * Get pairs for a specific user (mentor or mentee)
 */
export async function fetchUserPairs(userId: string): Promise<Pair[]> {
  const { data, error } = await supabase
    .from('mp_pairs')
    .select(`
      *,
      mentor:mp_profiles!mentor_id(id, full_name, email, department, avatar_url),
      mentee:mp_profiles!mentee_id(id, full_name, email, department, avatar_url)
    `)
    .or(`mentor_id.eq.${userId},mentee_id.eq.${userId}`)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user pairs:', error);
    throw error;
  }

  return data || [];
}
