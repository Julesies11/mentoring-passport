import { supabase } from '@/lib/supabase';

export interface Meeting {
  id: string;
  pair_id: string;
  pair_task_id: string | null;
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
      job_title?: string | null;
      avatar_url?: string | null;
    };
    mentee?: {
      id: string;
      full_name: string | null;
      job_title?: string | null;
      avatar_url?: string | null;
    };
  };
}

export interface CreateMeetingInput {
  pair_id: string;
  pair_task_id?: string | null;
  title: string;
  notes?: string;
  date_time: string;
}

export interface UpdateMeetingInput {
  title?: string;
  date_time?: string;
  status?: 'upcoming' | 'completed' | 'cancelled';
  notes?: string;
  pair_task_id?: string | null;
}

/**
 * Fetch all meetings (supervisor only)
 */
export async function fetchAllMeetings(): Promise<Meeting[]> {
  const { data, error } = await supabase
    .from('mp_meetings')
    .select(`
      *,
      pair:mp_pairs!pair_id(
        id,
        mentor:mp_profiles!mentor_id(id, full_name, job_title, avatar_url),
        mentee:mp_profiles!mentee_id(id, full_name, job_title, avatar_url)
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
    .select(`
      *,
      pair:mp_pairs!pair_id(
        id,
        mentor:mp_profiles!mentor_id(id, full_name, job_title, avatar_url),
        mentee:mp_profiles!mentee_id(id, full_name, job_title, avatar_url)
      )
    `)
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
        mentor:mp_profiles!mentor_id(id, full_name, job_title, avatar_url),
        mentee:mp_profiles!mentee_id(id, full_name, job_title, avatar_url)
      )
    `)
    .or(`mentor_id.eq.${userId},mentee_id.eq.${userId}`, { foreignTable: 'mp_pairs' })
    .eq('status', 'upcoming')
    .gte('date_time', new Date().toISOString())
    .order('date_time', { ascending: true })
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
      pair_task_id: input.pair_task_id,
      title: input.title,
      notes: input.notes,
      date_time: input.date_time,
      status: 'upcoming',
    })
    .select(`
      *,
      pair:mp_pairs!pair_id(
        id,
        mentor:mp_profiles!mentor_id(id, full_name, job_title, avatar_url),
        mentee:mp_profiles!mentee_id(id, full_name, job_title, avatar_url)
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
  const { data, error } = await supabase
    .from('mp_meetings')
    .update(input)
    .eq('id', meetingId)
    .select(`
      *,
      pair:mp_pairs!pair_id(
        id,
        mentor:mp_profiles!mentor_id(id, full_name, job_title, avatar_url),
        mentee:mp_profiles!mentee_id(id, full_name, job_title, avatar_url)
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
  const { data: meetingsData, error: meetingsError } = await supabase
    .from('mp_meetings')
    .select('status');

  if (meetingsError) {
    console.error('Error fetching meeting stats:', meetingsError);
    throw meetingsError;
  }

  const stats = {
    total: meetingsData.length,
    upcoming: meetingsData.filter(m => m.status === 'upcoming').length,
    completed: meetingsData.filter(m => m.status === 'completed').length,
    cancelled: meetingsData.filter(m => m.status === 'cancelled').length,
  };

  return stats;
}
