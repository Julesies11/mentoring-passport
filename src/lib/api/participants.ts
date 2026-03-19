import { ROLES, PROFILE_STATUS, UserRole, ProfileStatus } from '@/config/constants';
import { supabase } from '@/lib/supabase';

export interface Participant {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  job_title?: string;
  department?: string;
  status: ProfileStatus;
  avatar_url?: string;
  must_change_password?: boolean;
}

export interface CreateParticipantInput {
  email: string;
  password?: string;
  full_name: string;
  role: UserRole;
  job_title?: string;
  department?: string;
}

export interface UpdateParticipantInput {
  full_name?: string;
  job_title?: string | null;
  department?: string | null;
  phone?: string | null;
  bio?: string | null;
  status?: ProfileStatus;
  role?: UserRole;
  avatar_url?: string | null;
}

/**
 * Fetch all participants in the instance
 */
export async function fetchParticipants(programId?: string): Promise<Participant[]> {
  const query = supabase
    .from('mp_profiles')
    .select('*')
    .order('full_name');

  // Note: if programId filtering is strictly required for participants, 
  // it usually involves an inner join with pairs. For a general directory, we fetch all.
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Fetch participants by role
 */
export async function fetchParticipantsByRole(role: string): Promise<Participant[]> {
  const { data, error } = await supabase
    .from('mp_profiles')
    .select('*')
    .eq('role', role)
    .order('full_name');

  if (error) throw error;
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
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

/**
 * Fetch supervisors with their assigned programs
 */
export async function fetchOrgSupervisors() {
  const { data, error } = await supabase
    .from('mp_profiles')
    .select(`
      *,
      mp_supervisor_programs(program_id)
    `)
    .in('role', [ROLES.SUPERVISOR, ROLES.ORG_ADMIN, ROLES.ADMINISTRATOR])
    .order('full_name');

  if (error) throw error;
  return (data || []).map((s: any) => ({
    ...s,
    assigned_program_ids: s.mp_supervisor_programs?.map((sp: any) => sp.program_id) || []
  }));
}

export async function assignSupervisorToProgram(userId: string, programId: string) {
  const { error } = await supabase
    .from('mp_supervisor_programs')
    .insert({ user_id: userId, program_id: programId });
  if (error) throw error;
}

export async function removeSupervisorFromProgram(userId: string, programId: string) {
  const { error } = await supabase
    .from('mp_supervisor_programs')
    .delete()
    .eq('user_id', userId)
    .eq('program_id', programId);
  if (error) throw error;
}

export async function syncProgramSupervisors(programId: string, supervisorIds: string[]) {
  // Delete existing
  await supabase.from('mp_supervisor_programs').delete().eq('program_id', programId);
  
  // Insert new
  if (supervisorIds && supervisorIds.length > 0) {
    const inserts = supervisorIds.map(userId => ({ user_id: userId, program_id: programId }));
    await supabase.from('mp_supervisor_programs').insert(inserts);
  }
}

/**
 * Create a new participant
 */
export async function createParticipant(input: CreateParticipantInput): Promise<Participant> {
  const { data, error } = await supabase
    .from('mp_profiles')
    .insert({
      email: input.email,
      full_name: input.full_name,
      role: input.role,
      job_title: input.job_title,
      department: input.department,
      status: PROFILE_STATUS.ACTIVE,
      must_change_password: true
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an existing participant
 */
export async function updateParticipant(id: string, updates: Partial<UpdateParticipantInput>): Promise<Participant> {
  const { data, error } = await supabase
    .from('mp_profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Archive a participant
 */
export async function archiveParticipant(id: string): Promise<void> {
  const { error } = await supabase
    .from('mp_profiles')
    .update({ status: PROFILE_STATUS.ARCHIVED })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Restore a participant
 */
export async function restoreParticipant(id: string): Promise<void> {
  const { error } = await supabase
    .from('mp_profiles')
    .update({ status: PROFILE_STATUS.ACTIVE })
    .eq('id', id);

  if (error) throw error;
}
