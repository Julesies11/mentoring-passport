import { supabase } from '@/lib/supabase';

export interface Participant {
  id: string;
  email: string;
  role: 'supervisor' | 'mentor' | 'mentee';
  full_name: string | null;
  department: string | null;
  bio: string | null;
  avatar_url: string | null;
  phone: string | null;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface CreateParticipantInput {
  email: string;
  password: string;
  role: 'supervisor' | 'mentor' | 'mentee';
  full_name?: string;
  department?: string;
  phone?: string;
}

export interface UpdateParticipantInput {
  role?: 'supervisor' | 'mentor' | 'mentee';
  full_name?: string;
  department?: string;
  bio?: string;
  phone?: string;
  status?: 'active' | 'archived';
}

/**
 * Fetch all participants
 */
export async function fetchParticipants(): Promise<Participant[]> {
  const { data, error } = await supabase
    .from('mp_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching participants:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch participants by role
 */
export async function fetchParticipantsByRole(role: 'supervisor' | 'mentor' | 'mentee'): Promise<Participant[]> {
  const { data, error } = await supabase
    .from('mp_profiles')
    .select('*')
    .eq('role', role)
    .eq('status', 'active')
    .order('full_name', { ascending: true });

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
 * This creates both the auth user and the profile
 */
export async function createParticipant(input: CreateParticipantInput): Promise<Participant> {
  // Create the auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.full_name || '',
      },
    },
  });

  if (authError) {
    console.error('Error creating auth user:', authError);
    throw authError;
  }

  if (!authData.user) {
    throw new Error('Failed to create user');
  }

  // Update the profile with additional details
  // The profile is auto-created by the mp_handle_new_user trigger
  const { data: profile, error: profileError } = await supabase
    .from('mp_profiles')
    .update({
      role: input.role,
      full_name: input.full_name,
      department: input.department,
      phone: input.phone,
    })
    .eq('id', authData.user.id)
    .select()
    .single();

  if (profileError) {
    console.error('Error updating profile:', profileError);
    throw profileError;
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
export async function fetchParticipantStats() {
  const { data, error } = await supabase
    .from('mp_profiles')
    .select('role, status');

  if (error) {
    console.error('Error fetching participant stats:', error);
    throw error;
  }

  const stats = {
    total: data.length,
    active: data.filter(p => p.status === 'active').length,
    archived: data.filter(p => p.status === 'archived').length,
    supervisors: data.filter(p => p.role === 'supervisor' && p.status === 'active').length,
    mentors: data.filter(p => p.role === 'mentor' && p.status === 'active').length,
    mentees: data.filter(p => p.role === 'mentee' && p.status === 'active').length,
  };

  return stats;
}
