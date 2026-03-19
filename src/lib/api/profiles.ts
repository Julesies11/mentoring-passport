import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/logger';
import { uploadFile, getPublicUrl } from './storage';
import { ROLES, STORAGE_BUCKETS, UserRole, EntityStatus } from '@/config/constants';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  full_name: string | null;
  job_title_id: string | null;
  job_title_name?: string | null;
  bio: string | null;
  department: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileInput {
  full_name?: string;
  job_title_id?: string | null;
  bio?: string | null;
  department?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
}

/**
 * Helper to map database response to Profile interface
 */
function mapProfile(p: any): Profile {
  return {
    ...p,
    job_title_name: p.job_title?.title || 'No Job Title'
  };
}

/**
 * Fetch all users across the entire instance (Administrator only)
 */
export async function fetchAllUsers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('mp_profiles')
    .select('*, job_title:mp_job_titles(title)')
    .order('full_name', { ascending: true });

  if (error) {
    await logError({
      message: `Failed to fetch users: ${error.message}`,
      componentName: 'profiles-api'
    });
    throw error;
  }

  return (data || []).map(mapProfile);
}

/**
 * Search for users across the entire instance (Administrator only)
 */
export async function searchUsers(query: string): Promise<Profile[]> {
  if (!query) return fetchAllUsers();
  
  const { data, error } = await supabase
    .from('mp_profiles')
    .select('*, job_title:mp_job_titles(title)')
    .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
    .order('full_name', { ascending: true });

  if (error) {
    await logError({
      message: `Failed to search users: ${error.message}`,
      componentName: 'profiles-api',
      metadata: { query }
    });
    throw error;
  }

  return (data || []).map(mapProfile);
}

export async function updateProfile(userId: string, data: UpdateProfileInput): Promise<Profile> {
  try {
    const { data: profile, error } = await supabase
      .from('mp_profiles')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('*, job_title:mp_job_titles(title)')
      .single();

    if (error) throw error;
    return mapProfile(profile);
  } catch (err: any) {
    await logError({
      message: `Failed to update profile: ${err.message}`,
      stack: err.stack,
      componentName: 'profiles-api',
      metadata: { userId, data }
    });
    throw new Error(`Profile update failed: ${err.message}`);
  }
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data: profile, error } = await supabase
    .from('mp_profiles')
    .select('*, job_title:mp_job_titles(title)')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get profile: ${error.message}`);
  }

  return profile ? mapProfile(profile) : null;
}

/**
 * Constructs a full public URL for a user's avatar.
 * Reuses the shared storage utility.
 */
export function getAvatarUrl(userId: string, avatarPath?: string | null): string {
  return getPublicUrl(STORAGE_BUCKETS.AVATARS, avatarPath, userId);
}

/**
 * Handles uploading a new avatar or preparing for deletion.
 * Reuses the shared storage utility.
 */
export async function handleAvatarUpload(
  userId: string,
  file?: File | null,
  shouldDelete?: boolean,
  currentAvatarUrl?: string | null
): Promise<string | null | undefined> {
  if (shouldDelete) {
    return null;
  }

  if (file) {
    const fileName = `${userId}-${Date.now()}.jpg`;
    return await uploadFile(file, {
      bucket: STORAGE_BUCKETS.AVATARS,
      folder: userId,
      fileName,
      compressionPreset: 'AVATAR'
    });
  }

  return currentAvatarUrl;
}
