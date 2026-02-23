import { supabase } from '@/lib/supabase';

export interface Meeting {
  id: string;
  pair_id: string;
  title: string;
  date_time: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
  pair?: {
    id: string;
    mentor?: {
      id: string;
      full_name: string | null;
    };
    mentee?: {
      id: string;
      full_name: string | null;
    };
  };
}

export interface CreateMeetingInput {
  pair_id: string;
  title: string;
  description?: string;
  scheduled_at: string;
  duration_minutes: number;
  location?: string;
}

export interface UpdateMeetingInput {
  title?: string;
  description?: string;
  scheduled_at?: string;
  duration_minutes?: number;
  location?: string;
  status?: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
}

/**
 * Fetch all meetings (supervisor only)
 */
export async function fetchAllMeetings(): Promise<Meeting[]> {
  const { data, error } = await supabase
    .from('mp_meetings')
    .select(`
      *,
      pair:mp_pairs(
        id,
        mentor:mp_profiles!mp_pairs_mentor_id_fkey(id, full_name),
        mentee:mp_profiles!mp_pairs_mentee_id_fkey(id, full_name)
      )
    `)
    .order('date_time', { ascending: false });

  if (error) {
    console.error('Error fetching meetings:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch meetings for a specific pair
 */
export async function fetchPairMeetings(pairId: string): Promise<Meeting[]> {
  const { data, error } = await supabase
    .from('mp_meetings')
    .select('*')
    .eq('pair_id', pairId)
    .order('date_time', { ascending: false });

  if (error) {
    console.error('Error fetching pair meetings:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch upcoming meetings for a user
 */
export async function fetchUserUpcomingMeetings(userId: string): Promise<Meeting[]> {
  const { data, error } = await supabase
    .from('mp_meetings')
    .select(`
      *,
      pair:mp_pairs!inner(
        id,
        mentor:mp_profiles!mp_pairs_mentor_id_fkey(id, full_name),
        mentee:mp_profiles!mp_pairs_mentee_id_fkey(id, full_name)
      )
    `)
    .or(`pair.mentor_id.eq.${userId},pair.mentee_id.eq.${userId}`)
    .eq('status', 'scheduled')
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(10);

  if (error) {
    console.error('Error fetching user meetings:', error);
    throw error;
  }

  return data || [];
}

/**
 * Create a new meeting
 */
export async function createMeeting(input: CreateMeetingInput): Promise<Meeting> {
  const { data, error } = await supabase
    .from('mp_meetings')
    .insert({
      pair_id: input.pair_id,
      title: input.title,
      notes: input.description,
      date_time: input.scheduled_at,
      status: 'upcoming',
    })
    .select(`
      *,
      pair:mp_pairs(
        id,
        mentor:mp_profiles!mp_pairs_mentor_id_fkey(id, full_name),
        mentee:mp_profiles!mp_pairs_mentee_id_fkey(id, full_name)
      )
    `)
    .single();

  if (error) {
    console.error('Error creating meeting:', error);
    throw error;
  }

  return data;
}

/**
 * Update a meeting
 */
export async function updateMeeting(
  meetingId: string,
  input: UpdateMeetingInput
): Promise<Meeting> {
  const updateData: any = { ...input };

  if (input.status === 'completed' && !input.notes) {
    updateData.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('mp_meetings')
    .update(updateData)
    .eq('id', meetingId)
    .select(`
      *,
      pair:mp_pairs(
        id,
        mentor:mp_profiles!mp_pairs_mentor_id_fkey(id, full_name),
        mentee:mp_profiles!mp_pairs_mentee_id_fkey(id, full_name)
      )
    `)
    .single();

  if (error) {
    console.error('Error updating meeting:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a meeting
 */
export async function deleteMeeting(meetingId: string): Promise<void> {
  const { error } = await supabase
    .from('mp_meetings')
    .delete()
    .eq('id', meetingId);

  if (error) {
    console.error('Error deleting meeting:', error);
    throw error;
  }
}

/**
 * Get meeting statistics
 */
export async function fetchMeetingStats() {
  const { data, error } = await supabase
    .from('mp_meetings')
    .select('status');

  if (error) {
    console.error('Error fetching meeting stats:', error);
    throw error;
  }

  const stats = {
    total: data.length,
    scheduled: data.filter(m => m.status === 'scheduled').length,
    completed: data.filter(m => m.status === 'completed').length,
    cancelled: data.filter(m => m.status === 'cancelled').length,
  };

  return stats;
}
