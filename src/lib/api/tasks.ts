import { supabase } from '@/lib/supabase';

export interface Task {
  id: string;
  name: string;
  evidence_type_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  evidence_type?: {
    id: string;
    name: string;
  };
}

export interface PairTask {
  id: string;
  pair_id: string;
  task_id: string;
  status: 'not_submitted' | 'awaiting_review' | 'completed';
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  task?: Task;
}

/**
 * Fetch all tasks
 */
export async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('mp_tasks')
    .select(`
      *,
      evidence_type:mp_evidence_types(id, name)
    `)
    .order('sort_order', { ascending: true });

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
      *,
      task:mp_tasks(
        *,
        evidence_type:mp_evidence_types(id, name)
      )
    `)
    .eq('pair_id', pairId)
    .order('task(sort_order)', { ascending: true });

  if (error) {
    console.error('Error fetching pair tasks:', error);
    throw error;
  }

  return data || [];
}

/**
 * Update pair task status
 */
export async function updatePairTaskStatus(
  taskId: string,
  status: 'not_submitted' | 'awaiting_review' | 'completed'
): Promise<PairTask> {
  const updateData: any = { status };
  
  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('mp_pair_tasks')
    .update(updateData)
    .eq('id', taskId)
    .select(`
      *,
      task:mp_tasks(
        *,
        evidence_type:mp_evidence_types(id, name)
      )
    `)
    .single();

  if (error) {
    console.error('Error updating pair task:', error);
    throw error;
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
