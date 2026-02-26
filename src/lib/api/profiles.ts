import { supabase } from '@/lib/supabase';

export interface Profile {
  id: string;
  email: string;
  role: 'supervisor' | 'mentor' | 'mentee';
  full_name: string | null;
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
