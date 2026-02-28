import { supabase } from '@/lib/supabase';

export interface Note {
  id: string;
  pair_id: string;
  author_id: string;
  title: string | null;
  content: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    full_name: string | null;
    role: string;
  };
  pair?: {
    id: string;
    mentor?: {
      id: string;
      full_name: string | null;
    };
    mentee?: {
      id: string;
      full_name: string | null;
    };
  };
}

export interface CreateNoteInput {
  pair_id: string;
  title?: string;
  content: string;
  is_private: boolean;
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
  is_private?: boolean;
}

/**
 * Fetch notes for a specific pair
 */
export async function fetchPairNotes(pairId: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from('mp_notes')
    .select(`
      *,
      author:author_id(id, full_name, role)
    `)
    .eq('pair_id', pairId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pair notes:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch all notes for a user (across all their pairs)
 */
export async function fetchUserNotes(userId: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from('mp_notes')
    .select(`
      *,
      author:author_id(id, full_name, role),
      pair:mp_pairs!inner(
        id,
        mentor:mentor_id(id, full_name),
        mentee:mentee_id(id, full_name)
      )
    `)
    .or(`mentor_id.eq.${userId},mentee_id.eq.${userId}`, { foreignTable: 'mp_pairs' })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user notes:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch all notes (supervisor only)
 */
export async function fetchAllNotes(): Promise<Note[]> {
  const { data, error } = await supabase
    .from('mp_notes')
    .select(`
      *,
      author:author_id(id, full_name, role),
      pair:mp_pairs(
        id,
        mentor:mentor_id(id, full_name),
        mentee:mentee_id(id, full_name)
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching notes:', error);
    throw error;
  }

  return data || [];
}

/**
 * Create a new note
 */
export async function createNote(input: CreateNoteInput): Promise<Note> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('mp_notes')
    .insert({
      pair_id: input.pair_id,
      author_id: user.id,
      title: input.title,
      content: input.content,
      is_private: input.is_private,
    })
    .select(`
      *,
      author:author_id(id, full_name, role)
    `)
    .single();

  if (error) {
    console.error('Error creating note:', error);
    throw error;
  }

  return data;
}

/**
 * Update a note
 */
export async function updateNote(noteId: string, input: UpdateNoteInput): Promise<Note> {
  const { data, error } = await supabase
    .from('mp_notes')
    .update(input)
    .eq('id', noteId)
    .select(`
      *,
      author:author_id(id, full_name, role)
    `)
    .single();

  if (error) {
    console.error('Error updating note:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a note
 */
export async function deleteNote(noteId: string): Promise<void> {
  const { error } = await supabase
    .from('mp_notes')
    .delete()
    .eq('id', noteId);

  if (error) {
    console.error('Error deleting note:', error);
    throw error;
  }
}
