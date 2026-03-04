import { supabase } from '@/lib/supabase';

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
}

export async function updateProfile(userId: string, data: UpdateProfileInput): Promise<Profile> {
  const { data: profile, error } = await supabase
    .from('mp_profiles')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`);
  }

  return profile;
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
 * Handles both absolute URLs and Supabase storage paths.
 */
export function getAvatarUrl(userId: string, avatarPath?: string | null): string {
  if (!avatarPath) return '';
  
  // If it's already a full URL, return as is
  if (avatarPath.startsWith('http')) {
    return avatarPath;
  }
  
  // Construct Supabase public URL: bucket/userId/filename
  const fullPath = `${userId}/${avatarPath}`;
  const { data } = supabase.storage.from('mp-avatars').getPublicUrl(fullPath);
  return data.publicUrl;
}

/**
 * Handles uploading a new avatar or preparing for deletion.
 * Returns the new avatar_url (filename) to be saved in the database.
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
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('mp-avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;
    return fileName;
  }

  return currentAvatarUrl;
}
