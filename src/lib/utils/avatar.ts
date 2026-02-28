import { supabase } from '@/lib/supabase';

/**
 * Gets the public URL for a user's avatar.
 * Handles both full URLs and Supabase storage paths.
 */
export const getAvatarPublicUrl = (avatarUrl?: string | null, userId?: string | null) => {
  if (!avatarUrl) return undefined;

  // If it's already a full URL, return as is
  if (avatarUrl.startsWith('http')) {
    return avatarUrl;
  }

  // If it's a Supabase path, construct the public URL
  // The structure is bucket/user_id/filename
  const fullPath = userId ? `${userId}/${avatarUrl}` : avatarUrl;
  return supabase.storage.from('mp-avatars').getPublicUrl(fullPath).data.publicUrl;
};

/**
 * Generates initials from a name for avatar fallbacks.
 */
export const getInitials = (name?: string) => {
  if (!name) return 'U';
  return name
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};
