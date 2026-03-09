import { supabase } from '@/lib/supabase';
import { resizeImage, validateAvatar } from '@/lib/utils/image';
import { logError } from '@/lib/logger';

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
    // 1. Pre-flight validation (Gold Standard)
    const validation = validateAvatar(file);
    if (validation.error) {
      throw new Error(validation.error);
    }

    try {
      // 2. Resize and compress image
      const resizedBlob = await resizeImage(file, 400, 400);
      
      const fileExt = 'jpg';
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // 3. Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('mp-avatars')
        .upload(filePath, resizedBlob, { 
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      return fileName;
    } catch (err: any) {
      // LOG THE FAILURE TO THE DATABASE (GOLD STANDARD)
      await logError({
        message: `Avatar upload failed for user ${userId}: ${err.message}`,
        stack: err.stack,
        componentName: 'avatar-uploader',
        metadata: { 
          originalSize: file.size, 
          originalType: file.type,
          fileName: file.name
        }
      });

      // RETHROW so the UI can show the specific error
      throw err;
    }
  }

  return currentAvatarUrl;
}

