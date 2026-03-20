import { LOCATION_TYPE, LocationType, MEETING_STATUS, MeetingStatus } from '@/config/constants';
import { supabase } from '@/lib/supabase';
import { isFuture } from 'date-fns';

export interface Meeting {
  id: string;
  pair_id: string;
  pair_task_id: string | null;
  title: string;
  date_time: string;
  duration_minutes: number;
  notes: string | null;
  location: string | null;
  location_type: LocationType | null;
  location_details: string | null;
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
      job_title_id?: string | null;
      job_title_name?: string | null;
      avatar_url?: string | null;
    };
    mentee?: {
      id: string;
      full_name: string | null;
      job_title_id?: string | null;
      job_title_name?: string | null;
      avatar_url?: string | null;
    };
  };
  mp_pairs?: {
    id: string;
    mentor?: {
      id: string;
      full_name: string | null;
      job_title_id?: string | null;
      job_title_name?: string | null;
      avatar_url?: string | null;
    };
    mentee?: {
      id: string;
      full_name: string | null;
      job_title_id?: string | null;
      job_title_name?: string | null;
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
  duration_minutes?: number;
  location?: string | null;
  location_type?: LocationType | null;
  location_details?: string | null;
  status?: MeetingStatus;
}

export interface UpdateMeetingInput {
  title?: string;
  date_time?: string;
  duration_minutes?: number;
  notes?: string;
  pair_task_id?: string | null;
  location?: string | null;
  location_type?: LocationType | null;
  location_details?: string | null;
  status?: MeetingStatus;
}

/**
 * Calculates if a meeting is upcoming or past based on its date_time
 */
export function getMeetingStatus(dateTime: string): 'upcoming' | 'past' {
  return isFuture(new Date(dateTime)) ? 'upcoming' : 'past';
}

/**
 * Helper to map database response to Meeting interface
 */
function mapMeeting(m: any): Meeting {
  const mapPair = (pair: any) => {
    if (!pair) return undefined;
    return {
      ...pair,
      mentor: pair.mentor ? {
        ...pair.mentor,
        job_title_name: pair.mentor.job_title?.title || 'No Job Title'
      } : undefined,
      mentee: pair.mentee ? {
        ...pair.mentee,
        job_title_name: pair.mentee.job_title?.title || 'No Job Title'
      } : undefined
    };
  };

  return {
    ...m,
    pair: mapPair(m.mp_pairs),
    mp_pairs: mapPair(m.mp_pairs)
  };
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
        mentor:mp_profiles!mentor_id(id, full_name, job_title_id, job_title:mp_job_titles(title), avatar_url),
        mentee:mp_profiles!mentee_id(id, full_name, job_title_id, job_title:mp_job_titles(title), avatar_url)
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

  return (data || []).map(mapMeeting);
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
        mentor:mp_profiles!mentor_id(id, full_name, job_title_id, job_title:mp_job_titles(title), avatar_url),
        mentee:mp_profiles!mentee_id(id, full_name, job_title_id, job_title:mp_job_titles(title), avatar_url)
      ),
      task:mp_pair_tasks!pair_task_id(id, name)
    `)
    .eq('pair_id', pairId)
    .order('date_time', { ascending: false });

  if (error) {
    console.error('Error fetching pair meetings:', error);
    throw error;
  }

  return (data || []).map(mapMeeting);
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
        mentor:mp_profiles!mentor_id(id, full_name, job_title_id, job_title:mp_job_titles(title), avatar_url),
        mentee:mp_profiles!mentee_id(id, full_name, job_title_id, job_title:mp_job_titles(title), avatar_url)
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

  return (data || []).map(mapMeeting);
}

/**
 * Create a new meeting
 */
export async function createMeeting(input: CreateMeetingInput): Promise<Meeting> {
  let finalProgramId = input.program_id;

  // 1. Fetch pair details to get program context if not provided
  if (!finalProgramId) {
    const { data: pair, error: pairError } = await supabase
      .from('mp_pairs')
      .select('program_id')
      .eq('id', input.pair_id)
      .single();

    if (pairError || !pair) {
      throw new Error('Could not verify pairing context for meeting creation.');
    }
    finalProgramId = pair.program_id;
  }

  // 2. Insert the meeting
  const { data, error } = await supabase
    .from('mp_meetings')
    .insert({
      pair_id: input.pair_id,
      pair_task_id: input.pair_task_id,
      program_id: finalProgramId,
      title: input.title,
      notes: input.notes,
      date_time: input.date_time,
      duration_minutes: input.duration_minutes || 60,
      location: input.location,
      location_type: input.location_type || LOCATION_TYPE.OTHER,
      location_details: input.location_details,
      status: input.status || MEETING_STATUS.UPCOMING,
    })
    .select(`
      *,
      mp_pairs(
        id,
        mentor:mp_profiles!mentor_id(id, full_name, job_title_id, job_title:mp_job_titles(title), avatar_url),
        mentee:mp_profiles!mentee_id(id, full_name, job_title_id, job_title:mp_job_titles(title), avatar_url)
      ),
      task:mp_pair_tasks!pair_task_id(id, name)
    `)
    .single();

  if (error) {
    console.error('Error creating meeting:', error);
    throw error;
  }

  return mapMeeting(data);
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
        mentor:mp_profiles!mentor_id(id, full_name, job_title_id, job_title:mp_job_titles(title), avatar_url),
        mentee:mp_profiles!mentee_id(id, full_name, job_title_id, job_title:mp_job_titles(title), avatar_url)
      ),
      task:mp_pair_tasks!pair_task_id(id, name)
    `)
    .single();

  if (error) {
    console.error('Error updating meeting:', error);
    throw error;
  }

  return mapMeeting(data);
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

  return mapMeeting(data);
}
