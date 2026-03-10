import { supabase } from '@/lib/supabase';

export interface Program {
  id: string;
  organisation_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: 'active' | 'inactive' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface CreateProgramInput {
  organisation_id: string;
  name: string;
  start_date?: string | null;
  end_date?: string | null;
}

export interface UpdateProgramInput {
  name?: string;
  start_date?: string | null;
  end_date?: string | null;
  status?: 'active' | 'inactive' | 'archived';
}

/**
 * Fetch all programs for an organisation
 */
export async function fetchPrograms(organisationId: string): Promise<Program[]> {
  const { data, error } = await supabase
    .from('mp_programs')
    .select('*')
    .eq('organisation_id', organisationId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching programs:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch a single program by ID
 */
export async function fetchProgram(id: string): Promise<Program | null> {
  const { data, error } = await supabase
    .from('mp_programs')
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
 * Create a new program
 */
export async function createProgram(input: CreateProgramInput): Promise<Program> {
  const { data, error } = await supabase
    .from('mp_programs')
    .insert(input)
    .select()
    .single();

  if (error) {
    console.error('Error creating program:', error);
    throw error;
  }

  return data;
}

/**
 * Update a program
 */
export async function updateProgram(id: string, input: UpdateProgramInput): Promise<Program> {
  const { data, error } = await supabase
    .from('mp_programs')
    .update({
      ...input,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating program:', error);
    throw error;
  }

  return data;
}

/**
 * Archive a program
 */
export async function archiveProgram(id: string): Promise<void> {
  const { error } = await supabase
    .from('mp_programs')
    .update({ status: 'archived' })
    .eq('id', id);

  if (error) {
    console.error('Error archiving program:', error);
    throw error;
  }
}
