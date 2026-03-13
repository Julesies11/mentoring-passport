import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/logger';
import { uploadFile, getPublicUrl } from './storage';
import { ROLES, STORAGE_BUCKETS, UserRole, EntityStatus } from '@/config/constants';

export interface Profile {
  id: string;
  email: string;
  role: UserRole; // Inferred from memberships or global role
  full_name: string | null;
  job_title: string | null;
  bio: string | null;
  department: string | null;
  phone: string | null;
  avatar_url: string | null;
  organisation_id: string | null;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileInput {
  full_name?: string;
  job_title?: string | null;
  bio?: string | null;
  department?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  organisation_id?: string | null;
}

/**
 * Fetch all users across the entire system (Administrator only)
 */
export async function fetchAllUsers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('mp_profiles')
    .select(`
      *,
      memberships:mp_memberships(role, organisation_id)
    `)
    .order('full_name', { ascending: true });

  if (error) {
    await logError({
      message: `Failed to fetch users: ${error.message}`,
      componentName: 'profiles-api'
    });
    throw error;
  }

  // Derive role for each user (prefer non-program-member)
  return (data || []).map(p => {
    const role = (p.memberships as any[])?.find(m => m.role !== ROLES.PROGRAM_MEMBER)?.role 
      || (p.memberships as any[])?.[0]?.role 
      || ROLES.PROGRAM_MEMBER;
    return { ...p, role };
  }) as Profile[];
}

/**
 * Search for users across the entire system (Administrator only)
 */
export async function searchUsers(query: string): Promise<Profile[]> {
  if (!query) return fetchAllUsers();
  
  const { data, error } = await supabase
    .from('mp_profiles')
    .select(`
      *,
      memberships:mp_memberships(role, organisation_id)
    `)
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

  // Derive role for each user
  return (data || []).map(p => {
    const role = (p.memberships as any[])?.find(m => m.role !== ROLES.PROGRAM_MEMBER)?.role 
      || (p.memberships as any[])?.[0]?.role 
      || ROLES.PROGRAM_MEMBER;
    return { ...p, role };
  }) as Profile[];
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
      .select()
      .single();

    if (error) throw error;
    return profile;
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
    .select(`
      *,
      memberships:mp_memberships(role, organisation_id)
    `)
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get profile: ${error.message}`);
  }

  if (!profile) return null;

  // Derive role
  const role = (profile.memberships as any[])?.[0]?.role || ROLES.PROGRAM_MEMBER;

  return {
    ...profile,
    role
  } as any;
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

