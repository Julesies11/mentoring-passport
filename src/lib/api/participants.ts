import { supabase } from '@/lib/supabase';

export interface Participant {
  id: string;
  email: string;
  role: 'supervisor' | 'program-member' | 'administrator';
  full_name: string | null;
  job_title: string | null;
  department: string | null;
  bio: string | null;
  avatar_url: string | null;
  phone: string | null;
  status: 'active' | 'archived';
  organisation_id: string | null;
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
  role: 'supervisor' | 'program-member' | 'administrator';
  organisation_id?: string;
  full_name?: string;
  job_title?: string;
  department?: string;
  phone?: string;
}

export interface UpdateParticipantInput {
  role?: 'supervisor' | 'program-member' | 'administrator';
  organisation_id?: string | null;
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
export async function fetchParticipants(organisationId?: string, programId?: string): Promise<Participant[]> {
  // Defensive check: Ensure organisationId is a string and not an object from React Query context
  const validOrgId = (typeof organisationId === 'string' && organisationId !== '[object Object]') ? organisationId : undefined;
  
  // Use a join to get the membership role if we have an organisationId
  let query = supabase
    .from('mp_profiles')
    .select(`
      id, 
      email, 
      role, 
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

  if (validOrgId) {
    query = query.eq('organisation_id', validOrgId);
  }

  // If programId is provided, filter participants who are part of that program
  if (programId && typeof programId === 'string' && programId !== '[object Object]') {
    // We join through mp_pairs to find participants in the program
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

  // Map the results to prefer the membership role for the current organisation
  return (data || []).map(p => {
    const membership = (p.memberships as any[])?.find(m => m.organisation_id === validOrgId);
    return {
      ...p,
      role: membership?.role || p.role // Fallback to profile role
    };
  }) as Participant[];
}

/**
 * Fetch participants by role
 */
export async function fetchParticipantsByRole(role: 'supervisor' | 'program-member', organisationId?: string, programId?: string): Promise<Participant[]> {
  let query = supabase
    .from('mp_profiles')
    .select(`
      id, 
      email, 
      role, 
      full_name, 
      job_title, 
      department, 
      avatar_url, 
      phone, 
      status, 
      organisation_id,
      memberships:mp_memberships(role, organisation_id)
    `)
    .eq('status', 'active')
    .order('full_name', { ascending: true })
    .limit(1000);

  if (organisationId) {
    query = query.eq('organisation_id', organisationId);
  }

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

  // Filter and map to current org context
  return (data || [])
    .map(p => {
      const membership = (p.memberships as any[])?.find(m => m.organisation_id === organisationId);
      return {
        ...p,
        role: membership?.role || p.role
      };
    })
    .filter(p => p.role === role) as Participant[];
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
 * Fetch all supervisors for an organisation with their assigned programs
 */
export async function fetchOrgSupervisors(organisationId: string) {
  // 1. Fetch memberships joined with profiles
  // We already ensured this relationship exists in migration 056
  const { data: memberships, error: memberError } = await supabase
    .from('mp_memberships')
    .select(`
      user_id,
      role,
      status,
      profile:mp_profiles(id, full_name, email, job_title, avatar_url)
    `)
    .eq('organisation_id', organisationId)
    .in('role', ['org-admin', 'supervisor']);

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
    // We don't necessarily want to crash the whole list if just assignments fail, 
    // but throwing maintains consistency with other API functions.
    throw assignError;
  }

  // 3. Merge the data in TypeScript
  return memberships.map(m => {
    const userAssignments = assignments?.filter(a => a.user_id === m.user_id) || [];
    return {
      id: m.user_id,
      full_name: (m.profile as any)?.full_name,
      email: (m.profile as any)?.email,
      job_title: (m.profile as any)?.job_title,
      avatar_url: (m.profile as any)?.avatar_url,
      role: m.role,
      status: m.status,
      assigned_program_ids: userAssignments.map(a => a.program_id)
    };
  });
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
  if (import.meta.env.DEV) console.log('Creating participant via RPC:', input.email);
  
  // Use the RPC function to create user without logging out the supervisor
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

  // Create initial membership record
  const { error: membershipError } = await supabase
    .from('mp_memberships')
    .insert({
      user_id: newUserId,
      organisation_id: input.organisation_id,
      role: input.role as any,
      status: 'active'
    });

  if (membershipError) {
    console.error('Error creating membership for new user:', membershipError);
    // We don't throw here as the profile already exists and is linked via organisation_id for now
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
export async function fetchParticipantStats(organisationId?: string, programId?: string) {
  let query = supabase.from('mp_profiles').select(`
    id, 
    role, 
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
      role: membership?.role || p.role
    };
  });

  const stats = {
    total: mappedData.length,
    active: mappedData.filter(p => p.status === 'active').length,
    archived: mappedData.filter(p => p.status === 'archived').length,
    supervisors: mappedData.filter(p => p.role === 'supervisor' && p.status === 'active').length,
    'program-members': mappedData.filter(p => p.role === 'program-member' && p.status === 'active').length,
  };

  return stats;
}
