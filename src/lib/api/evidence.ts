import { supabase } from '@/lib/supabase';
import { createNotification } from '@/lib/api/notifications';
import { updatePairTaskStatus } from './tasks';

export interface Evidence {
  id: string;
  pair_id: string;
  pair_task_id: string | null;
  pair_subtask_id: string | null;
  meeting_id: string | null;
  submitted_by: string;
  type: 'photo' | 'text' | 'file';
  file_url: string | null;
  file_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  description: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  task?: { id: string; name: string };
  subtask?: { id: string; name: string };
}

export interface CreateEvidenceInput {
  pair_id: string;
  pair_task_id?: string;
  pair_subtask_id?: string;
  evidence_type_id?: string;
  file_url: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
  description?: string;
  status?: 'pending' | 'approved';
}

/**
 * Helper to get a stable public URL for a storage path
 */
export function getEvidenceUrl(path: string | null): string {
  if (!path) return '';
  if (path.startsWith('http')) return path; // Already a full URL
  
  // If it's a storage path, get the public URL
  const { data } = supabase.storage
    .from('mp-evidence-photos')
    .getPublicUrl(path);
    
  return data.publicUrl;
}

/**
 * Fetch evidence for a specific pair, optionally filtered by task
 */
export async function fetchPairEvidence(pairId: string, taskId?: string): Promise<Evidence[]> {
  let query = supabase
    .from('mp_evidence_uploads')
    .select(`
      *,
      task:mp_pair_tasks!pair_task_id(id, name),
      subtask:mp_pair_subtasks!pair_subtask_id(id, name)
    `)
    .eq('pair_id', pairId);

  if (taskId) query = query.eq('pair_task_id', taskId);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;

  // Transform file_url to full public URL if it's just a path
  return (data || []).map(item => ({
    ...item,
    file_url: getEvidenceUrl(item.file_url)
  }));
}

/**
 * Delete evidence record and its file from storage
 */
export async function deleteEvidence(evidenceId: string): Promise<void> {
  const { data: evidence, error: fetchError } = await supabase
    .from('mp_evidence_uploads')
    .select('file_url')
    .eq('id', evidenceId)
    .single();

  if (fetchError) throw fetchError;

  if (evidence?.file_url) {
    const path = evidence.file_url;
    await supabase.storage.from('mp-evidence-photos').remove([path]);
  }

  const { error: deleteError } = await supabase
    .from('mp_evidence_uploads')
    .delete()
    .eq('id', evidenceId);

  if (deleteError) throw deleteError;
}

/**
 * Create new evidence
 */
export async function createEvidence(input: CreateEvidenceInput): Promise<Evidence> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('mp_evidence_uploads')
    .insert({
      pair_id: input.pair_id,
      pair_task_id: input.pair_task_id,
      pair_subtask_id: input.pair_subtask_id,
      evidence_type_id: input.evidence_type_id,
      file_url: input.file_url, // Store path
      file_name: input.file_name,
      mime_type: input.mime_type,
      file_size: input.file_size,
      description: input.description,
      submitted_by: user.id,
      type: input.mime_type?.startsWith('image/') ? 'photo' : 'file',
      status: input.status || 'pending',
    })
    .select('*')
    .single();

  if (error) throw error;

  // Transform file_url to full public URL for immediate UI update
  const returnData = {
    ...data,
    file_url: getEvidenceUrl(data.file_url)
  };

  // Notification Logic (Fire and Forget)
  try {
    const { data: pair } = await supabase.from('mp_pairs').select('mentor_id, mentee_id').eq('id', input.pair_id).single();
    if (pair) {
      const recipientId = user.id === pair.mentor_id ? pair.mentee_id : pair.mentor_id;
      createNotification(recipientId, 'evidence_uploaded', 'New Evidence', 'New evidence was uploaded for a task.', '/program-member/tasks');
      
      const { data: supervisor } = await supabase.from('mp_profiles').select('id').eq('role', 'supervisor').maybeSingle();
      if (supervisor) createNotification(supervisor.id, 'evidence_uploaded', 'Review Required', 'New evidence is awaiting review.', '/supervisor/evidence-review');
    }
  } catch (e) { /* ignore notification errors */ }

  return returnData;
}

/**
 * Upload evidence file to storage
 */
export async function uploadEvidenceFile(file: File, pairId: string): Promise<string> {
  const path = `${pairId}/${Date.now()}/${file.name}`;
  const { error } = await supabase.storage.from('mp-evidence-photos').upload(path, file);
  if (error) throw error;
  return path; // Return relative path for database storage
}

/**
 * Get evidence statistics
 */
export async function fetchEvidenceStats() {
  const { data, error } = await supabase
    .from('mp_evidence_uploads')
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

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (!bytes || bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
