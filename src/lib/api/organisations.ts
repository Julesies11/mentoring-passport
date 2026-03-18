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

/**
 * Fetch singleton organisation
 */
export async function fetchSingletonOrganisation(): Promise<Organisation | null> {
  const { data, error } = await supabase
    .from('mp_organisations')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error) {
    await logError({
      message: `Failed to fetch organisation: ${error.message}`,
      componentName: 'organisations-api'
    });
    throw error;
  }

  return data;
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
 * Fetch instance statistics (Administrator only)
 */
export async function fetchInstanceStats() {
  try {
    const [users, programs, pairs] = await Promise.all([
      supabase.from('mp_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('mp_programs').select('*', { count: 'exact', head: true }),
      supabase.from('mp_pairs').select('*', { count: 'exact', head: true })
    ]);

    if (users.error) console.error('Error fetching user count:', users.error);
    if (programs.error) console.error('Error fetching program count:', programs.error);
    if (pairs.error) console.error('Error fetching pair count:', pairs.error);

    return {
      users: users.count || 0,
      programs: programs.count || 0,
      pairs: pairs.count || 0
    };
  } catch (err) {
    console.error('Unexpected error in fetchInstanceStats:', err);
    return { users: 0, programs: 0, pairs: 0 };
  }
}
