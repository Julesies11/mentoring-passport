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
  };
  mentee?: {
    id: string;
    full_name: string | null;
    email: string;
    department: string | null;
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
      mentor:mp_profiles!mentor_id(id, full_name, email, department),
      mentee:mp_profiles!mentee_id(id, full_name, email, department)
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
      mentor:mp_profiles!mentor_id(id, full_name, email, department),
      mentee:mp_profiles!mentee_id(id, full_name, email, department)
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
 */
export async function createPair(input: CreatePairInput): Promise<Pair> {
  const { data, error } = await supabase
    .from('mp_pairs')
    .insert(input)
    .select(`
      *,
      mentor:mp_profiles!mentor_id(id, full_name, email, department),
      mentee:mp_profiles!mentee_id(id, full_name, email, department)
    `)
    .single();

  if (error) {
    console.error('Error creating pair:', error);
    throw error;
  }

  return data;
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
      mentor:mp_profiles!mentor_id(id, full_name, email, department),
      mentee:mp_profiles!mentee_id(id, full_name, email, department)
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
      mentor:mp_profiles!mentor_id(id, full_name, email, department),
      mentee:mp_profiles!mentee_id(id, full_name, email, department)
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
