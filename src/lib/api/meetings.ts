import { LOCATION_TYPE, LocationType, MEETING_STATUS, MeetingStatus } from '@/config/constants';
import { supabase } from '@/lib/supabase';
import { isFuture } from 'date-fns';

export interface Meeting {
  id: string;
  pair_id: string;
  pair_task_id: string | null;
  title: string;
  date_time: string;
  notes: string | null;
  location: string | null;
  location_type: LocationType | null;
  status: MeetingStatus;
  created_at: string;
  updated_at: string;
  task?: {
    id: string;
    name: string;
  };
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
  mp_pairs?: {
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
  program_id?: string | null;
  title: string;
  notes?: string;
  date_time: string;
  location?: string | null;
  location_type?: LocationType | null;
  status?: MeetingStatus;
}

export interface UpdateMeetingInput {
  title?: string;
  date_time?: string;
  notes?: string;
  pair_task_id?: string | null;
  location?: string | null;
  location_type?: LocationType | null;
  status?: MeetingStatus;
}

/**
 * Calculates if a meeting is upcoming or past based on its date_time
 */
export function getMeetingStatus(dateTime: string): 'upcoming' | 'past' {
  return isFuture(new Date(dateTime)) ? 'upcoming' : 'past';
}

/**
 * Fetch all meetings (supervisor only)
 */
export async function fetchAllMeetings(programId?: string): Promise<Meeting[]> {
  let query = supabase
    .from('mp_meetings')
    .select(`
      *,
      mp_pairs!inner(
        id,
        program_id,
        mentor:mp_profiles!mentor_id(id, full_name, job_title, avatar_url),
        mentee:mp_profiles!mentee_id(id, full_name, job_title, avatar_url)
      ),
      task:mp_pair_tasks!pair_task_id(id, name)
    `);

  if (programId && typeof programId === 'string' && programId !== '[object Object]') {
    query = query.eq('mp_pairs.program_id', programId);
  }

  const { data, error } = await query.order('date_time', { ascending: false });

  if (error) {
    console.error('Error fetching meetings:', error);
    throw error;
  }

  return (data || []).map(m => ({ ...m, pair: m.mp_pairs }));
}

/**
 * Fetch meetings for a specific pair
 */
export async function fetchPairMeetings(pairId: string): Promise<Meeting[]> {
  const { data, error } = await supabase
    .from('mp_meetings')
    .select(`
      *,
      mp_pairs(
        id,
        mentor:mp_profiles!mentor_id(id, full_name, job_title, avatar_url),
        mentee:mp_profiles!mentee_id(id, full_name, job_title, avatar_url)
      ),
      task:mp_pair_tasks!pair_task_id(id, name)
    `)
    .eq('pair_id', pairId)
    .order('date_time', { ascending: false });

  if (error) {
    console.error('Error fetching pair meetings:', error);
    throw error;
  }

  return (data || []).map(m => ({ ...m, pair: m.mp_pairs }));
}

/**
 * Fetch upcoming meetings for a user
 */
export async function fetchUserUpcomingMeetings(userId: string): Promise<Meeting[]> {
  const { data, error } = await supabase
    .from('mp_meetings')
    .select(`
      *,
      mp_pairs(
        id,
        mentor:mp_profiles!mentor_id(id, full_name, job_title, avatar_url),
        mentee:mp_profiles!mentee_id(id, full_name, job_title, avatar_url)
      ),
      task:mp_pair_tasks!pair_task_id(id, name)
    `)
    .or(`mentor_id.eq.${userId},mentee_id.eq.${userId}`, { foreignTable: 'mp_pairs' })
    .gte('date_time', new Date().toISOString())
    .order('date_time', { ascending: true })
    .limit(10);

  if (error) {
    console.error('Error fetching user meetings:', error);
    throw error;
  }

  return (data || []).map(m => ({ ...m, pair: m.mp_pairs }));
}

/**
 * Create a new meeting
 */
export async function createMeeting(input: CreateMeetingInput): Promise<Meeting> {
  // 1. Fetch pair details to get program context
  const { data: pair, error: pairError } = await supabase
    .from('mp_pairs')
    .select('program_id')
    .eq('id', input.pair_id)
    .single();

  if (pairError || !pair) {
    throw new Error('Could not verify pairing context for meeting creation.');
  }

  // 2. Insert the meeting
  const { data, error } = await supabase
    .from('mp_meetings')
    .insert({
      pair_id: input.pair_id,
      pair_task_id: input.pair_task_id,
      program_id: pair.program_id,
      title: input.title,
      notes: input.notes,
      date_time: input.date_time,
      location: input.location,
      location_type: input.location_type || LOCATION_TYPE.OTHER,
      status: input.status || MEETING_STATUS.UPCOMING,
    })
    .select(`
      *,
      mp_pairs(
        id,
        mentor:mp_profiles!mentor_id(id, full_name, job_title, avatar_url),
        mentee:mp_profiles!mentee_id(id, full_name, job_title, avatar_url)
      ),
      task:mp_pair_tasks!pair_task_id(id, name)
    `)
    .single();

  if (error) {
    console.error('Error creating meeting:', error);
    throw error;
  }

  return { ...data, pair: data.mp_pairs };
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
      mp_pairs(
        id,
        mentor:mp_profiles!mentor_id(id, full_name, job_title, avatar_url),
        mentee:mp_profiles!mentee_id(id, full_name, job_title, avatar_url)
      ),
      task:mp_pair_tasks!pair_task_id(id, name)
    `)
    .single();

  if (error) {
    console.error('Error updating meeting:', error);
    throw error;
  }

  return { ...data, pair: data.mp_pairs };
}

/**
 * Delete a meeting
 */
export async function deleteMeeting(meetingId: string): Promise<Meeting> {
  const { data, error } = await supabase
    .from('mp_meetings')
    .delete()
    .eq('id', meetingId)
    .select(`
      *,
      mp_pairs(
        id,
        mentor_id,
        mentee_id,
        mentor:mp_profiles!mentor_id(id, full_name),
        mentee:mp_profiles!mentee_id(id, full_name)
      )
    `)
    .single();

  if (error) {
    console.error('Error deleting meeting:', error);
    throw error;
  }

  return { ...data, pair: data.mp_pairs };
}

/**
 * Get meeting statistics
 */
export async function fetchMeetingStats(programId?: string) {
  let query = supabase
    .from('mp_meetings')
    .select('date_time, mp_pairs!inner(program_id)');

  if (programId && typeof programId === 'string' && programId !== '[object Object]') {
    query = query.eq('mp_pairs.program_id', programId);
  }

  const { data: meetingsData, error: meetingsError } = await query;

  if (meetingsError) {
    console.error('Error fetching meeting stats:', meetingsError);
    throw meetingsError;
  }

  const stats = {
    total: meetingsData.length,
    upcoming: meetingsData.filter(m => isFuture(new Date(m.date_time))).length,
    past: meetingsData.filter(m => !isFuture(new Date(m.date_time))).length,
  };

  return stats;
}
