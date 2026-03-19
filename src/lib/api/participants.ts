import { ROLES, PROFILE_STATUS, UserRole, ProfileStatus } from '@/config/constants';
import { supabase } from '@/lib/supabase';

export interface Participant {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  job_title_id?: string;
  job_title_name?: string;
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
  job_title_id?: string;
  department?: string;
}

export interface UpdateParticipantInput {
  full_name?: string;
  job_title_id?: string | null;
  department?: string | null;
  phone?: string | null;
  bio?: string | null;
  status?: ProfileStatus;
  role?: UserRole;
  avatar_url?: string | null;
}

/**
 * Helper to map database response to Participant interface
 */
function mapParticipant(p: any): Participant {
  return {
    ...p,
    job_title_name: p.job_title?.title || 'No Job Title'
  };
}

/**
 * Fetch all participants in the instance
 */
export async function fetchParticipants(programId?: string): Promise<Participant[]> {
  const query = supabase
    .from('mp_profiles')
    .select('*, job_title:mp_job_titles(title)')
    .order('full_name');

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapParticipant);
}

/**
 * Fetch participants by role
 */
export async function fetchParticipantsByRole(role: string): Promise<Participant[]> {
  const { data, error } = await supabase
    .from('mp_profiles')
    .select('*, job_title:mp_job_titles(title)')
    .eq('role', role)
    .order('full_name');

  if (error) throw error;
  return (data || []).map(mapParticipant);
}

/**
 * Fetch a single participant by ID
 */
export async function fetchParticipant(id: string): Promise<Participant | null> {
  const { data, error } = await supabase
    .from('mp_profiles')
    .select('*, job_title:mp_job_titles(title)')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return mapParticipant(data);
}

/**
 * Fetch supervisors with their assigned programs
 */
export async function fetchOrgSupervisors() {
  const { data, error } = await supabase
    .from('mp_profiles')
    .select(`
      *,
      job_title:mp_job_titles(title),
      mp_supervisor_programs(program_id)
    `)
    .in('role', [ROLES.SUPERVISOR, ROLES.ORG_ADMIN, ROLES.ADMINISTRATOR])
    .order('full_name');

  if (error) throw error;
  return (data || []).map((s: any) => ({
    ...mapParticipant(s),
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
      job_title_id: input.job_title_id,
      department: input.department,
      status: PROFILE_STATUS.ACTIVE,
      must_change_password: true
    })
    .select('*, job_title:mp_job_titles(title)')
    .single();

  if (error) throw error;
  return mapParticipant(data);
}

/**
 * Update an existing participant
 */
export async function updateParticipant(id: string, updates: Partial<UpdateParticipantInput>): Promise<Participant> {
  const { data, error } = await supabase
    .from('mp_profiles')
    .update(updates)
    .eq('id', id)
    .select('*, job_title:mp_job_titles(title)')
    .single();

  if (error) throw error;
  return mapParticipant(data);
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
