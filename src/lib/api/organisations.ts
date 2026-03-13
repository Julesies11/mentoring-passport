import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/logger';

export interface Organisation {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SetupOrganisationInput {
  orgName: string;
  supervisorEmail: string;
  supervisorPassword: string;
  supervisorName: string;
}

/**
 * Fetch all organisations (Administrator only)
 */
export async function fetchOrganisations(): Promise<Organisation[]> {
  const { data, error } = await supabase
    .from('mp_organisations')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    await logError({
      message: `Failed to fetch organisations: ${error.message}`,
      componentName: 'organisations-api'
    });
    throw error;
  }

  return data || [];
}

/**
 * Fetch a single organisation by ID
 */
export async function fetchOrganisation(id: string): Promise<Organisation | null> {
  if (!id || typeof id !== 'string' || id === '[object Object]') {
    console.warn('fetchOrganisation called with invalid id:', id);
    return null;
  }

  const { data, error } = await supabase
    .from('mp_organisations')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    await logError({
      message: `Failed to fetch organisation: ${error.message}`,
      componentName: 'organisations-api',
      metadata: { id }
    });
    throw error;
  }

  return data;
}

/**
 * Setup a new organisation with its first supervisor (Administrator only)
 */
export async function setupOrganisation(input: SetupOrganisationInput): Promise<string> {
  const { data: orgId, error } = await supabase.rpc('mp_admin_setup_organisation', {
    org_name: input.orgName,
    supervisor_email: input.supervisorEmail,
    supervisor_password: input.supervisorPassword,
    supervisor_name: input.supervisorName
  });

  if (error) {
    await logError({
      message: `Failed to setup organisation: ${error.message}`,
      componentName: 'organisations-api',
      metadata: input
    });
    throw error;
  }

  return orgId;
}

/**
 * Update an organisation
 */
export async function updateOrganisation(id: string, data: Partial<Organisation>): Promise<Organisation> {
  const { data: org, error } = await supabase
    .from('mp_organisations')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    await logError({
      message: `Failed to update organisation: ${error.message}`,
      componentName: 'organisations-api',
      metadata: { id, data }
    });
    throw error;
  }

  return org;
}

/**
 * Fetch global statistics (Administrator only)
 */
export async function fetchGlobalStats() {
  try {
    const [orgs, users, programs, pairs] = await Promise.all([
      supabase.from('mp_organisations').select('*', { count: 'exact', head: true }),
      supabase.from('mp_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('mp_programs').select('*', { count: 'exact', head: true }),
      supabase.from('mp_pairs').select('*', { count: 'exact', head: true })
    ]);

    // Check for errors in any of the requests
    if (orgs.error) console.error('Error fetching org count:', orgs.error);
    if (users.error) console.error('Error fetching user count:', users.error);
    if (programs.error) console.error('Error fetching program count:', programs.error);
    if (pairs.error) console.error('Error fetching pair count:', pairs.error);

    return {
      organisations: orgs.count || 0,
      users: users.count || 0,
      programs: programs.count || 0,
      pairs: pairs.count || 0
    };
  } catch (err) {
    console.error('Unexpected error in fetchGlobalStats:', err);
    return { organisations: 0, users: 0, programs: 0, pairs: 0 };
  }
}

/**
 * Fetch counts for a specific organisation
 */
export async function fetchOrgCounts(organisationId: string) {
  try {
    const [users, programs] = await Promise.all([
      supabase.from('mp_profiles').select('*', { count: 'exact', head: true }).eq('organisation_id', organisationId),
      supabase.from('mp_programs').select('*', { count: 'exact', head: true }).eq('organisation_id', organisationId)
    ]);

    return {
      users: users.count || 0,
      programs: programs.count || 0
    };
  } catch (err) {
    console.error('Error in fetchOrgCounts:', err);
    return { users: 0, programs: 0 };
  }
}
