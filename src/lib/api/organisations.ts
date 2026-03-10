import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/logger';
import { uploadFile, getPublicUrl } from './storage';

export interface Organisation {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateOrganisationInput {
  name?: string;
  logo_url?: string | null;
}

/**
 * Fetch all organisations
 */
export async function fetchAllOrganisations(): Promise<Organisation[]> {
  const { data, error } = await supabase
    .from('mp_organisations')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching organisations:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch a single organisation by ID
 */
export async function fetchOrganisation(id: string): Promise<Organisation | null> {
  const { data, error } = await supabase
    .from('mp_organisations')
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
 * Update an organisation
 */
export async function updateOrganisation(id: string, input: UpdateOrganisationInput): Promise<Organisation> {
  const { data, error } = await supabase
    .from('mp_organisations')
    .update({
      ...input,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    await logError({
      message: `Failed to update organisation: ${error.message}`,
      stack: error.stack,
      componentName: 'organisations-api',
      metadata: { id, input }
    });
    throw error;
  }

  return data;
}

/**
 * Constructs a full public URL for an organisation's logo.
 */
export function getLogoUrl(logoPath?: string | null): string {
  return getPublicUrl('mp-logos', logoPath);
}

/**
 * Handles uploading a new logo or preparing for deletion.
 */
export async function handleLogoUpload(
  organisationId: string,
  file?: File | null,
  shouldDelete?: boolean,
  currentLogoUrl?: string | null
): Promise<string | null | undefined> {
  if (shouldDelete) {
    return null;
  }

  if (file) {
    const fileName = `${organisationId}-${Date.now()}.jpg`;
    return await uploadFile(file, {
      bucket: 'mp-logos',
      fileName
    });
  }

  return currentLogoUrl;
}
