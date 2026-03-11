import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/logger';
import { uploadFile, getPublicUrl } from './storage';

export interface Profile {
  id: string;
  email: string;
  role: 'supervisor' | 'program-member';
  full_name: string | null;
  job_title: string | null;
  bio: string | null;
  department: string | null;
  phone: string | null;
  avatar_url: string | null;
  organisation_id: string | null;
  status: 'active' | 'archived';
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
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get profile: ${error.message}`);
  }

  return profile;
}

/**
 * Constructs a full public URL for a user's avatar.
 * Reuses the shared storage utility.
 */
export function getAvatarUrl(userId: string, avatarPath?: string | null): string {
  return getPublicUrl('mp-avatars', avatarPath, userId);
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
      bucket: 'mp-avatars',
      folder: userId,
      fileName,
      compressionPreset: 'AVATAR'
    });
  }

  return currentAvatarUrl;
}

