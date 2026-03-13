import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/logger';

import { uploadFile, getPublicUrl } from './storage';
import { STORAGE_BUCKETS } from '@/config/constants';

export interface Organisation {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Constructs a full public URL for an organisation's logo.
 */
export function getOrganisationLogoUrl(orgId: string, logoPath?: string | null): string {
  if (!logoPath) return '';
  return getPublicUrl(STORAGE_BUCKETS.LOGOS, logoPath, orgId);
}

/**
 * Handles uploading a new logo or preparing for deletion.
 */
export async function handleLogoUpload(
  orgId: string,
  file?: File | null,
  shouldDelete?: boolean,
  currentLogoUrl?: string | null
): Promise<string | null | undefined> {
  if (shouldDelete) {
    return null;
  }

  if (file) {
    const fileName = `${orgId}-${Date.now()}.jpg`;
    return await uploadFile(file, {
      bucket: STORAGE_BUCKETS.LOGOS,
      folder: orgId,
      fileName,
      compressionPreset: 'AVATAR' // Reusing AVATAR preset for consistent sizing
    });
  }

  return currentLogoUrl;
}

export interface SetupOrganisationInput {
  orgName: string;
  orgLogoUrl?: string | null;
  adminMode: 'new' | 'existing';
  adminUserId?: string;
  adminEmail?: string;
  adminPassword?: string;
  adminName?: string;
}

/**
 * Fetch all organisations with their Org Admins (Administrator only)
 * Performs app-side join to follow project standards.
 */
export async function fetchOrganisationsWithAdmins(): Promise<(Organisation & { admins: any[] })[]> {
  const { data: orgs, error: orgError } = await supabase
    .from('mp_organisations')
    .select('*')
    .order('name', { ascending: true });

  if (orgError) throw orgError;
  if (!orgs || orgs.length === 0) return [];

  // App-side join: Fetch all org-admin memberships for these organisations
  const { data: memberships, error: memError } = await supabase
    .from('mp_memberships')
    .select(`
      organisation_id,
      user_id,
      role,
      profile:mp_profiles (
        id,
        full_name,
        email,
        avatar_url
      )
    `)
    .in('organisation_id', orgs.map(o => o.id))
    .eq('role', 'org-admin')
    .eq('status', 'active');

  if (memError) throw memError;

  // Merge data
  return orgs.map(org => ({
    ...org,
    admins: memberships
      ?.filter(m => m.organisation_id === org.id)
      ?.map(m => m.profile)
      ?.filter(Boolean) || []
  }));
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
 * Setup a new organisation with its first org-admin (Administrator only)
 */
export async function setupOrganisation(input: SetupOrganisationInput): Promise<string> {
  const { data: orgId, error } = await supabase.rpc('mp_admin_setup_organisation_v2', {
    org_name: input.orgName,
    org_logo_url: input.orgLogoUrl,
    admin_mode: input.adminMode,
    admin_user_id: input.adminUserId,
    admin_name: input.adminName,
    admin_email: input.adminEmail,
    admin_password: input.adminPassword
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
