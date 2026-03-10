import { supabase } from '@/lib/supabase';

export interface Participant {
  id: string;
  email: string;
  role: 'supervisor' | 'program-member';
  full_name: string | null;
  job_title: string | null;
  department: string | null;
  bio: string | null;
  avatar_url: string | null;
  phone: string | null;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
  active_mentor_count: number;
  active_mentee_count: number;
  inactive_mentor_count: number;
  inactive_mentee_count: number;
}

export interface CreateParticipantInput {
  email: string;
  password: string;
  role: 'supervisor' | 'program-member';
  full_name?: string;
  job_title?: string;
  department?: string;
  phone?: string;
}

export interface UpdateParticipantInput {
  role?: 'supervisor' | 'program-member';
  full_name?: string;
  job_title?: string;
  department?: string;
  bio?: string;
  phone?: string;
  avatar_url?: string | null;
  status?: 'active' | 'archived';
}

/**
 * Fetch all participants
 */
export async function fetchParticipants(programId?: string): Promise<Participant[]> {
  let query = supabase
    .from('mp_profiles')
    .select('id, email, role, full_name, job_title, department, avatar_url, phone, status, created_at')
    .order('created_at', { ascending: false })
    .limit(1000);

  // If programId is provided, filter participants who are part of that program
  if (programId && typeof programId === 'string' && programId !== '[object Object]') {
    // We join through mp_pairs to find participants in the program
    // A participant is in a program if they are either a mentor or a mentee in a pair
    const { data: pairProfiles } = await supabase
      .from('mp_pairs')
      .select('mentor_id, mentee_id')
      .eq('program_id', programId);
    
    if (pairProfiles) {
      const ids = new Set<string>();
      pairProfiles.forEach(p => {
        if (p.mentor_id) ids.add(p.mentor_id);
        if (p.mentee_id) ids.add(p.mentee_id);
      });
      
      if (ids.size > 0) {
        query = query.in('id', Array.from(ids));
      } else {
        return []; // No participants in this program
      }
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching participants:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch participants by role
 */
export async function fetchParticipantsByRole(role: 'supervisor' | 'program-member', programId?: string): Promise<Participant[]> {
  let query = supabase
    .from('mp_profiles')
    .select('id, email, role, full_name, job_title, department, avatar_url, phone, status')
    .eq('role', role)
    .eq('status', 'active')
    .order('full_name', { ascending: true })
    .limit(1000);

  if (programId && typeof programId === 'string' && programId !== '[object Object]' && role === 'program-member') {
    const { data: pairProfiles } = await supabase
      .from('mp_pairs')
      .select('mentor_id, mentee_id')
      .eq('program_id', programId);
    
    if (pairProfiles) {
      const ids = new Set<string>();
      pairProfiles.forEach(p => {
        if (p.mentor_id) ids.add(p.mentor_id);
        if (p.mentee_id) ids.add(p.mentee_id);
      });
      
      if (ids.size > 0) {
        query = query.in('id', Array.from(ids));
      } else {
        return [];
      }
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching participants by role:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch a single participant by ID
 */
export async function fetchParticipant(id: string): Promise<Participant | null> {
  const { data, error } = await supabase
    .from('mp_profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching participant:', error);
    throw error;
  }

  return data;
}

/**
 * Create a new participant (supervisor only)
 * This creates both the auth user and the profile using a secure RPC
 */
export async function createParticipant(input: CreateParticipantInput & { avatar_url?: string }): Promise<Participant> {
  if (import.meta.env.DEV) console.log('Creating participant via RPC:', input.email);
  
  // Use the RPC function to create user without logging out the supervisor
  const { data: newUserId, error: rpcError } = await supabase.rpc('mp_admin_create_user', {
    email_input: input.email,
    password_input: input.password,
    full_name_input: input.full_name || '',
    role_input: input.role,
    job_title_input: input.job_title || null,
    department_input: input.department || null,
    phone_input: input.phone || null,
    avatar_url_input: input.avatar_url || null
  });

  if (rpcError) {
    console.error('Error in mp_admin_create_user RPC:', rpcError);
    
    // Handle specific PostgreSQL error for duplicate keys (23505)
    if (rpcError.message?.includes('users_email_partial_key') || rpcError.message?.includes('unique constraint')) {
      throw new Error('A user with this email address already exists.');
    }
    
    throw new Error(rpcError.message || 'Failed to create user account.');
  }

  // Fetch the newly created profile
  const { data: profile, error: fetchError } = await supabase
    .from('mp_profiles')
    .select('*')
    .eq('id', newUserId)
    .single();

  if (fetchError || !profile) {
    console.error('Error fetching created profile:', fetchError);
    throw new Error('User created but profile not found');
  }

  return profile;
}

/**
 * Update a participant (supervisor only)
 */
export async function updateParticipant(id: string, input: UpdateParticipantInput): Promise<Participant> {
  const { data, error } = await supabase
    .from('mp_profiles')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating participant:', error);
    throw error;
  }

  return data;
}

/**
 * Archive a participant (soft delete)
 */
export async function archiveParticipant(id: string): Promise<void> {
  const { error } = await supabase
    .from('mp_profiles')
    .update({ status: 'archived' })
    .eq('id', id);

  if (error) {
    console.error('Error archiving participant:', error);
    throw error;
  }
}

/**
 * Restore an archived participant
 */
export async function restoreParticipant(id: string): Promise<void> {
  const { error } = await supabase
    .from('mp_profiles')
    .update({ status: 'active' })
    .eq('id', id);

  if (error) {
    console.error('Error restoring participant:', error);
    throw error;
  }
}

/**
 * Get participant statistics
 */
export async function fetchParticipantStats(programId?: string) {
  let query = supabase.from('mp_profiles').select('id, role, status');

  if (programId && typeof programId === 'string' && programId !== '[object Object]') {
    const { data: pairProfiles } = await supabase
      .from('mp_pairs')
      .select('mentor_id, mentee_id')
      .eq('program_id', programId);
    
    if (pairProfiles) {
      const ids = new Set<string>();
      pairProfiles.forEach(p => {
        if (p.mentor_id) ids.add(p.mentor_id);
        if (p.mentee_id) ids.add(p.mentee_id);
      });
      
      if (ids.size > 0) {
        query = query.in('id', Array.from(ids));
      } else {
        return { total: 0, active: 0, archived: 0, supervisors: 0, 'program-members': 0 };
      }
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching participant stats:', error);
    throw error;
  }

  const stats = {
    total: data.length,
    active: data.filter(p => p.status === 'active').length,
    archived: data.filter(p => p.status === 'archived').length,
    supervisors: data.filter(p => p.role === 'supervisor' && p.status === 'active').length,
    'program-members': data.filter(p => p.role === 'program-member' && p.status === 'active').length,
  };

  return stats;
}
