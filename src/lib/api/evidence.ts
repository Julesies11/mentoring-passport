import { supabase } from '@/lib/supabase';

export interface Evidence {
  id: string;
  pair_id: string;
  task_id: string | null;
  meeting_id: string | null;
  submitted_by: string;
  type: 'photo' | 'text';
  file_url: string | null;
  description: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  task?: {
    id: string;
    name: string;
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
  reviewer?: {
    id: string;
    full_name: string | null;
  };
}

export interface CreateEvidenceInput {
  pair_id: string;
  task_id: string;
  evidence_type_id: string;
  file_url: string;
  description?: string;
}

export interface ReviewEvidenceInput {
  status: 'approved' | 'rejected';
  rejection_reason?: string;
}

/**
 * Fetch all evidence (supervisor only)
 */
export async function fetchAllEvidence(): Promise<Evidence[]> {
  const { data, error } = await supabase
    .from('mp_evidence')
    .select(`
      *,
      task:mp_tasks(id, name),
      pair:mp_pairs(
        id,
        mentor:mp_profiles!mp_pairs_mentor_id_fkey(id, full_name),
        mentee:mp_profiles!mp_pairs_mentee_id_fkey(id, full_name)
      ),
      reviewer:mp_profiles!mp_evidence_reviewed_by_fkey(id, full_name)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching evidence:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch evidence for a specific pair
 */
export async function fetchPairEvidence(pairId: string): Promise<Evidence[]> {
  const { data, error } = await supabase
    .from('mp_evidence')
    .select(`
      *,
      task:mp_tasks(id, name),
      evidence_type:mp_evidence_types(id, name),
      reviewer:mp_profiles!mp_evidence_reviewed_by_fkey(id, full_name)
    `)
    .eq('pair_id', pairId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pair evidence:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch pending evidence (supervisor only)
 */
export async function fetchPendingEvidence(): Promise<Evidence[]> {
  const { data, error } = await supabase
    .from('mp_evidence')
    .select(`
      *,
      task:mp_tasks(id, name),
      evidence_type:mp_evidence_types(id, name),
      pair:mp_pairs(
        id,
        mentor:mp_profiles!mp_pairs_mentor_id_fkey(id, full_name),
        mentee:mp_profiles!mp_pairs_mentee_id_fkey(id, full_name)
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pending evidence:', error);
    throw error;
  }

  return data || [];
}

/**
 * Create new evidence
 */
export async function createEvidence(input: CreateEvidenceInput): Promise<Evidence> {
  const { data, error } = await supabase
    .from('mp_evidence')
    .insert({
      pair_id: input.pair_id,
      task_id: input.task_id,
      evidence_type_id: input.evidence_type_id,
      file_url: input.file_url,
      description: input.description,
      status: 'pending',
    })
    .select(`
      *,
      task:mp_tasks(id, name),
      evidence_type:mp_evidence_types(id, name)
    `)
    .single();

  if (error) {
    console.error('Error creating evidence:', error);
    throw error;
  }

  return data;
}

/**
 * Review evidence (supervisor only)
 */
export async function reviewEvidence(
  evidenceId: string,
  input: ReviewEvidenceInput
): Promise<Evidence> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const updateData: any = {
    status: input.status,
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
  };

  if (input.status === 'rejected' && input.rejection_reason) {
    updateData.rejection_reason = input.rejection_reason;
  }

  const { data, error } = await supabase
    .from('mp_evidence')
    .update(updateData)
    .eq('id', evidenceId)
    .select(`
      *,
      task:mp_tasks(id, name),
      evidence_type:mp_evidence_types(id, name),
      reviewer:mp_profiles!mp_evidence_reviewed_by_fkey(id, full_name)
    `)
    .single();

  if (error) {
    console.error('Error reviewing evidence:', error);
    throw error;
  }

  return data;
}

/**
 * Upload evidence file to storage
 */
export async function uploadEvidenceFile(
  file: File,
  pairId: string
): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${pairId}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('mp-evidence-photos')
    .upload(fileName, file);

  if (error) {
    console.error('Error uploading file:', error);
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('mp-evidence-photos')
    .getPublicUrl(data.path);

  return publicUrl;
}

/**
 * Get evidence statistics
 */
export async function fetchEvidenceStats() {
  const { data, error } = await supabase
    .from('mp_evidence')
    .select('status');

  if (error) {
    console.error('Error fetching evidence stats:', error);
    throw error;
  }

  const stats = {
    total: data.length,
    pending: data.filter(e => e.status === 'pending').length,
    approved: data.filter(e => e.status === 'approved').length,
    rejected: data.filter(e => e.status === 'rejected').length,
  };

  return stats;
}
