import { supabase } from '@/lib/supabase';
import { logDebug } from '@/lib/logger';
import { ROLES, STATUS, UserRole, EntityStatus } from '@/config/constants';

export interface Participant {
  id: string;
  email: string;
  full_name: string | null;
  job_title: string | null;
  department: string | null;
  bio: string | null;
  avatar_url: string | null;
  phone: string | null;
  status: EntityStatus;
  organisation_id: string | null;
  created_at: string;
  updated_at: string;
  active_mentor_count: number;
  active_mentee_count: number;
  inactive_mentor_count: number;
  inactive_mentee_count: number;
  role: UserRole; // Contextual role from mp_memberships
}

export interface CreateParticipantInput {
  email: string;
  password: string;
  role: UserRole;
  organisation_id?: string;
  full_name?: string;
  job_title?: string;
  department?: string;
  phone?: string;
}

export interface UpdateParticipantInput {
  full_name?: string;
  job_title?: string;
  department?: string;
  bio?: string;
  phone?: string;
  avatar_url?: string | null;
  status?: EntityStatus;
  role?: UserRole; // Used for membership sync
  organisation_id?: string; // Used for membership sync, not stored in mp_profiles
}

/**
 * Fetch all participants
 */
export async function fetchParticipants(organisationId?: string, programId?: string): Promise<Participant[]> {
  let query = supabase
    .from('mp_profiles')
    .select(`
      id, 
      email, 
      full_name, 
      job_title, 
      department, 
      avatar_url, 
      phone, 
      status, 
      organisation_id, 
      created_at,
      memberships:mp_memberships(role, organisation_id)
    `)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (organisationId && typeof organisationId === 'string' && organisationId !== '[object Object]') {
    query = query.eq('organisation_id', organisationId);
  }

  // If programId is provided, filter participants who are part of that program
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
        return [];
      }
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching participants:', error);
    throw error;
  }

  // Map the results to resolve the role for the requested organisation
  return (data || []).map(p => {
    const memberships = (p.memberships as any[]) || [];
    // If we have a organisationId, find that specific membership. 
    // Otherwise, prefer any non-program-member role, or just the first one.
    const membership = organisationId 
      ? memberships.find(m => m.organisation_id === organisationId)
      : memberships.find(m => m.role !== ROLES.PROGRAM_MEMBER) || memberships[0];

    return {
      ...p,
      role: membership?.role || ROLES.PROGRAM_MEMBER
    };
  }) as Participant[];
}

/**
 * Fetch participants by role
 */
export async function fetchParticipantsByRole(role: UserRole, organisationId?: string, programId?: string): Promise<Participant[]> {
  let query = supabase
    .from('mp_profiles')
    .select(`
      id, 
      email, 
      full_name, 
      job_title, 
      department, 
      avatar_url, 
      phone, 
      status, 
      organisation_id,
      memberships:mp_memberships(role, organisation_id)
    `)
    .eq('status', STATUS.ACTIVE)
    .order('full_name', { ascending: true })
    .limit(1000);

  if (organisationId) {
    query = query.eq('organisation_id', organisationId);
  }

  if (programId && typeof programId === 'string' && programId !== '[object Object]' && role === ROLES.PROGRAM_MEMBER) {
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

  // Filter and map to contextually resolve the role
  return (data || [])
    .map(p => {
      const memberships = (p.memberships as any[]) || [];
      const membership = organisationId
        ? memberships.find(m => m.organisation_id === organisationId)
        : memberships.find(m => m.role === role) || memberships[0];
        
      return {
        ...p,
        role: membership?.role || role
      };
    })
    .filter(p => p.role === role) as Participant[];
}

/**
 * Fetch a single participant by ID
 */
export async function fetchParticipant(id: string, organisationId?: string): Promise<Participant | null> {
  const { data, error } = await supabase
    .from('mp_profiles')
    .select(`
      *,
      memberships:mp_memberships(role, organisation_id)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching participant:', error);
    throw error;
  }

  if (!data) return null;

  const memberships = (data.memberships as any[]) || [];
  const membership = organisationId 
    ? memberships.find(m => m.organisation_id === organisationId)
    : memberships[0];

  return {
    ...data,
    role: membership?.role || ROLES.PROGRAM_MEMBER
  } as any;
}

/**
 * Fetch all supervisors for an organisation with their assigned programs
 */
export async function fetchOrgSupervisors(organisationId?: string) {
  // 1. Fetch memberships joined with profiles
  let query = supabase
    .from('mp_memberships')
    .select(`
      user_id,
      role,
      status,
      profile:mp_profiles(id, full_name, email, job_title, avatar_url)
    `)
    .in('role', ['org-admin', 'supervisor']);

  if (organisationId) {
    query = query.eq('organisation_id', organisationId);
  }

  const { data: memberships, error: memberError } = await query;

  if (memberError) {
    console.error('Error fetching org memberships:', memberError);
    throw memberError;
  }

  if (!memberships || memberships.length === 0) return [];

  // 2. Fetch program assignments for these specific users
  const userIds = memberships.map(m => m.user_id);
  const { data: assignments, error: assignError } = await supabase
    .from('mp_supervisor_programs')
    .select('user_id, program_id')
    .in('user_id', userIds);

  if (assignError) {
    console.error('Error fetching supervisor program assignments:', assignError);
    throw assignError;
  }

  // 3. Merge the data in TypeScript
  const uniqueSupervisors = new Map();
  
  memberships.forEach(m => {
    if (!uniqueSupervisors.has(m.user_id)) {
      const userAssignments = assignments?.filter(a => a.user_id === m.user_id) || [];
      uniqueSupervisors.set(m.user_id, {
        id: m.user_id,
        full_name: (m.profile as any)?.full_name,
        email: (m.profile as any)?.email,
        job_title: (m.profile as any)?.job_title,
        avatar_url: (m.profile as any)?.avatar_url,
        role: m.role,
        status: m.status,
        assigned_program_ids: userAssignments.map(a => a.program_id)
      });
    }
  });

  return Array.from(uniqueSupervisors.values());
}

/**
 * Assign a supervisor to a program
 */
export async function assignSupervisorToProgram(userId: string, programId: string): Promise<void> {
  const { error } = await supabase
    .from('mp_supervisor_programs')
    .insert({ user_id: userId, program_id: programId });

  if (error && error.code !== '23505') { // Ignore duplicate key
    console.error('Error assigning supervisor to program:', error);
    throw error;
  }
}

/**
 * Remove a supervisor from a program
 */
export async function removeSupervisorFromProgram(userId: string, programId: string): Promise<void> {
  const { error } = await supabase
    .from('mp_supervisor_programs')
    .delete()
    .eq('user_id', userId)
    .eq('program_id', programId);

  if (error) {
    console.error('Error removing supervisor from program:', error);
    throw error;
  }
}

/**
 * Sync supervisors for a program
 * @param programId The program ID
 * @param supervisorIds Array of supervisor user IDs that should be assigned to this program
 */
export async function syncProgramSupervisors(programId: string, supervisorIds: string[]): Promise<void> {
  // 1. Fetch current assignments
  const { data: currentAssignments, error: fetchError } = await supabase
    .from('mp_supervisor_programs')
    .select('user_id')
    .eq('program_id', programId);

  if (fetchError) {
    console.error('Error fetching current supervisor assignments:', fetchError);
    throw fetchError;
  }

  const currentIds = currentAssignments?.map(a => a.user_id) || [];

  // 2. Identify additions and removals
  const toAdd = supervisorIds.filter(id => !currentIds.includes(id));
  const toRemove = currentIds.filter(id => !supervisorIds.includes(id));

  // 3. Perform removals
  if (toRemove.length > 0) {
    const { error: removeError } = await supabase
      .from('mp_supervisor_programs')
      .delete()
      .eq('program_id', programId)
      .in('user_id', toRemove);

    if (removeError) {
      console.error('Error removing supervisors from program:', removeError);
      throw removeError;
    }
  }

  // 4. Perform additions
  if (toAdd.length > 0) {
    const { error: addError } = await supabase
      .from('mp_supervisor_programs')
      .insert(toAdd.map(userId => ({
        program_id: programId,
        user_id: userId
      })));

    if (addError) {
      console.error('Error adding supervisors to program:', addError);
      throw addError;
    }
  }
}

/**
 * Create a new participant (supervisor only)
 * This creates both the auth user and the profile using a secure RPC
 */
export async function createParticipant(input: CreateParticipantInput & { avatar_url?: string }): Promise<Participant> {
  logDebug('Creating participant via RPC:', input.email);
  
  // Use the RPC function to create user without logging out the supervisor
  // The RPC also creates the membership record (see migration 057)
  const { data: newUserId, error: rpcError } = await supabase.rpc('mp_admin_create_user', {
    email_input: input.email,
    password_input: input.password,
    full_name_input: input.full_name || '',
    role_input: input.role,
    organisation_id_input: input.organisation_id || null,
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

  // Fetch the newly created profile with its role
  return fetchParticipant(newUserId, input.organisation_id) as Promise<Participant>;
}

/**
 * Update a participant (supervisor only)
 */
export async function updateParticipant(id: string, input: UpdateParticipantInput): Promise<Participant> {
  const { role, organisation_id, ...profileData } = input;

  // 1. Update profile
  const { error } = await supabase
    .from('mp_profiles')
    .update(profileData)
    .eq('id', id);

  if (error) {
    console.error('Error updating participant profile:', error);
    throw error;
  }

  // 2. If role and organisation_id are provided, sync membership
  if (role && organisation_id) {
    const { error: memberError } = await supabase
      .from('mp_memberships')
      .update({ role: role as any })
      .eq('user_id', id)
      .eq('organisation_id', organisation_id);

    if (memberError) {
      console.error('Error updating participant membership role:', memberError);
    }
  }

  return fetchParticipant(id, organisation_id) as Promise<Participant>;
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
export async function fetchParticipantStats(organisationId?: string, programId?: string) {
  let query = supabase.from('mp_profiles').select(`
    id, 
    status, 
    organisation_id,
    memberships:mp_memberships(role, organisation_id)
  `);

  if (organisationId) {
    query = query.eq('organisation_id', organisationId);
  }

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

  // Map to membership roles
  const mappedData = data.map(p => {
    const membership = (p.memberships as any[])?.find(m => m.organisation_id === organisationId);
    return {
      ...p,
      role: membership?.role || ROLES.PROGRAM_MEMBER
    };
  });

  const stats = {
    total: mappedData.length,
    active: mappedData.filter(p => p.status === STATUS.ACTIVE).length,
    archived: mappedData.filter(p => p.status === STATUS.ARCHIVED).length,
    supervisors: mappedData.filter(p => p.role === ROLES.SUPERVISOR && p.status === STATUS.ACTIVE).length,
    'program-members': mappedData.filter(p => p.role === ROLES.PROGRAM_MEMBER && p.status === STATUS.ACTIVE).length,
  };

  return stats;
}
