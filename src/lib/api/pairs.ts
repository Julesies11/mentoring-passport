import { PAIR_STATUS, PairStatus, TASK_STATUS } from '@/config/constants';
import { supabase } from '@/lib/supabase';

export interface Pair {
  id: string;
  mentor_id: string;
  mentee_id: string;
  program_id: string | null;
  status: PairStatus;
  created_at: string;
  updated_at: string;
  mentor?: {
    id: string;
    full_name: string | null;
    email: string;
    job_title: string | null;
    department: string | null;
    avatar_url: string | null;
    phone?: string | null;
  };
  mentee?: {
    id: string;
    full_name: string | null;
    email: string;
    job_title: string | null;
    department: string | null;
    avatar_url: string | null;
    phone?: string | null;
  };
  program?: {
    id: string;
    name: string;
    status: string;
    start_date: string | null;
  };
}

export interface CreatePairInput {
  mentor_id: string;
  mentee_id: string;
  program_id: string;
}

export interface UpdatePairInput {
  status?: PairStatus;
}

/**
 * Fetch all pairs for a specific program in the instance
 */
export async function fetchPairs(programId?: string): Promise<Pair[]> {
  // Defensive check: Ensure programId is a string and not an object
  if (programId && (typeof programId !== 'string' || programId === '[object Object]')) {
    console.warn('fetchPairs called with invalid programId:', programId);
    return [];
  }

  let query = supabase
    .from('mp_pairs')
    .select(`
      *,
      mentor:mp_profiles!mentor_id(id, full_name, email, job_title, department, avatar_url, bio, phone),
      mentee:mp_profiles!mentee_id(id, full_name, email, job_title, department, avatar_url, bio, phone),
      program:mp_programs(id, name, status)
    `);

  if (programId) {
    query = query.eq('program_id', programId);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(1000);

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
      mentor:mp_profiles!mentor_id(id, full_name, email, job_title, department, avatar_url, bio, phone),
      mentee:mp_profiles!mentee_id(id, full_name, email, job_title, department, avatar_url, bio, phone)
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
  // Defensive check for program_id
  if (!input.program_id || input.program_id === 'undefined' || typeof input.program_id !== 'string') {
    console.error('createPair called with invalid program_id:', input.program_id);
    throw new Error('Invalid program selection. Please ensure a program is selected.');
  }

  // Step 1: Fetch the "Not Applicable" evidence type to use as a fallback
  const { data: naEvidenceType } = await supabase
    .from('mp_evidence_types')
    .select('id')
    .ilike('name', '%Not Applicable%')
    .limit(1)
    .single();

  const fallbackEvidenceTypeId = naEvidenceType?.id;

  // Step 2: Create the pair
  const { data: pair, error: pairError } = await supabase
    .from('mp_pairs')
    .insert({
      ...input
    })
    .select(`
      *,
      mentor:mp_profiles!mentor_id(id, full_name, email, job_title, department, avatar_url, bio, phone),
      mentee:mp_profiles!mentee_id(id, full_name, email, job_title, department, avatar_url, bio, phone)
    `)
    .single();

  if (pairError) {
    console.error('Error creating pair:', pairError);
    throw pairError;
  }

  // Step 3: Fetch all active tasks for the program
  const { data: programTasks, error: tasksError } = await supabase
    .from('mp_program_tasks')
    .select('id, name, evidence_type_id, sort_order')
    .eq('is_active', true)
    .eq('program_id', input.program_id)
    .order('sort_order', { ascending: true });

  if (tasksError) {
    console.error('Error fetching program tasks:', tasksError);
    throw tasksError;
  }

  if (programTasks && programTasks.length > 0) {
    // Step 4: Batch create pair_tasks and return the created IDs
    const pairTasksToInsert = programTasks.map(task => ({
      pair_id: pair.id,
      program_task_id: task.id,
      name: task.name,
      evidence_type_id: task.evidence_type_id || fallbackEvidenceTypeId,
      sort_order: task.sort_order,
      status: TASK_STATUS.NOT_SUBMITTED,
      is_custom: false,
      program_id: input.program_id
    })).filter(pt => !!pt.evidence_type_id);

    if (pairTasksToInsert.length > 0) {
      const { data: createdPairTasks, error: pairTasksError } = await supabase
        .from('mp_pair_tasks')
        .insert(pairTasksToInsert)
        .select('id, program_task_id');

      if (pairTasksError) {
        console.error('Error creating pair tasks:', pairTasksError);
      } else if (createdPairTasks && createdPairTasks.length > 0) {
        // Step 5: Fetch ALL program subtasks for these program tasks in one go
        const programTaskIds = programTasks.map(t => t.id);
        const { data: allProgramSubtasks, error: subtasksError } = await supabase
          .from('mp_program_subtasks')
          .select('id, program_task_id, name, sort_order, master_subtask_id')
          .in('program_task_id', programTaskIds)
          .order('sort_order', { ascending: true });

        if (subtasksError) {
          console.error('Error fetching program subtasks:', subtasksError);
        } else if (allProgramSubtasks && allProgramSubtasks.length > 0) {
          // Step 6: Map program subtasks to their new pair_task_id and batch insert
          const pairSubtasksToInsert = allProgramSubtasks.map(subtask => {
            const pairTask = createdPairTasks.find(pt => pt.program_task_id === subtask.program_task_id);
            if (!pairTask) return null;

            return {
              pair_task_id: pairTask.id,
              master_subtask_id: subtask.master_subtask_id,
              name: subtask.name,
              evidence_type_id: fallbackEvidenceTypeId,
              sort_order: subtask.sort_order,
              is_completed: false,
              is_custom: false
            };
          }).filter(st => st !== null && !!st.evidence_type_id);

          if (pairSubtasksToInsert.length > 0) {
            const { error: pairSubtasksError } = await supabase
              .from('mp_pair_subtasks')
              .insert(pairSubtasksToInsert);

            if (pairSubtasksError) {
              console.error('Error creating pair subtasks:', pairSubtasksError);
            }
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
      mentor:mp_profiles!mentor_id(id, full_name, email, job_title, department, avatar_url, bio, phone),
      mentee:mp_profiles!mentee_id(id, full_name, email, job_title, department, avatar_url, bio, phone)
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
    .update({ status: PAIR_STATUS.ARCHIVED })
    .eq('id', id);

  if (error) {
    console.error('Error archiving pair:', error);
    throw error;
  }
}

/**
 * Restore an archived pair
 */
export async function restorePair(id: string): Promise<void> {
  const { error } = await supabase
    .from('mp_pairs')
    .update({ status: PAIR_STATUS.ACTIVE })
    .eq('id', id);

  if (error) {
    console.error('Error restoring pair:', error);
    throw error;
  }
}

/**
 * Get pairs for a specific user (mentor or mentee)
 */
export async function fetchUserPairs(userId: string): Promise<Pair[]> {
  const { data, error } = await supabase
    .from('mp_pairs')
    .select(`
      *,
      mentor:mp_profiles!mentor_id(id, full_name, email, job_title, department, avatar_url, bio, phone),
      mentee:mp_profiles!mentee_id(id, full_name, email, job_title, department, avatar_url, bio, phone),
      program:mp_programs(id, name, status, start_date)
    `)
    .or(`mentor_id.eq.${userId},mentee_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) {
    console.error('Error fetching user pairs:', error);
    throw error;
  }

  return data || [];
}
