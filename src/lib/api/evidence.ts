import { supabase } from '@/lib/supabase';
import { updatePairTaskStatus } from './tasks';
import { NotificationService } from './notifications-service';
import { uploadFile } from './storage';

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
  task?: { id: string; name: string; evidence_notes: string | null; rejection_reason: string | null };
  subtask?: { id: string; name: string };
  pair?: {
    id: string;
    mentor?: { id: string; full_name: string | null; job_title: string | null; avatar_url?: string | null };
    mentee?: { id: string; full_name: string | null; job_title: string | null; avatar_url?: string | null };
  };
  reviewer?: { id: string; full_name: string | null };
  all_files?: { id: string; file_name: string | null; file_url: string | null; mime_type: string | null; created_at: string }[];
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

export interface ReviewEvidenceInput {
  status: 'approved' | 'rejected';
  rejection_reason?: string;
}

/**
 * Helper to get a secure signed URL for a storage path
 */
export async function getEvidenceUrl(path: string | null): Promise<string> {
  if (!path) return '';
  if (path.startsWith('http')) return path;

  try {
    const { data, error } = await supabase.storage
      .from('mp-evidence-photos')
      .createSignedUrl(path, 3600);
      
    if (error) return '';
    return data.signedUrl;
  } catch (_err: any) {
    return '';
  }
}

/**
 * Fetch all evidence (supervisor only)
 */
export async function fetchAllEvidence(programId?: string, organisationId?: string): Promise<Evidence[]> {
  let query = supabase
    .from('mp_evidence_uploads')
    .select(`
      *,
      task:mp_pair_tasks!pair_task_id(id, name, evidence_notes, rejection_reason),
      subtask:mp_pair_subtasks!pair_subtask_id(id, name),
      pair:mp_pairs!inner(
        id,
        program_id,
        mentor:mentor_id(id, full_name, job_title),
        mentee:mentee_id(id, full_name, job_title)
      ),
      reviewer:mp_profiles!reviewed_by(id, full_name)
    `);

  if (programId && typeof programId === 'string' && programId !== '[object Object]') {
    query = query.eq('pair.program_id', programId);
  } else if (organisationId) {
    // organisation filtering handled by RLS
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return groupEvidenceByTask(data || []);
}

/**
 * Fetch pending and rejected evidence (supervisor only)
 */
export async function fetchPendingEvidence(programId?: string, organisationId?: string): Promise<Evidence[]> {
  let query = supabase
    .from('mp_evidence_uploads')
    .select(`
      *,
      task:mp_pair_tasks!pair_task_id(id, name, evidence_notes, rejection_reason),
      subtask:mp_pair_subtasks!pair_subtask_id(id, name),
      pair:mp_pairs!inner(
        id,
        program_id,
        mentor:mentor_id(id, full_name, avatar_url, job_title),
        mentee:mentee_id(id, full_name, avatar_url, job_title)
      )
    `)
    .in('status', ['pending', 'rejected']);

  if (programId && typeof programId === 'string' && programId !== '[object Object]') {
    query = query.eq('pair.program_id', programId);
  } else if (organisationId) {
    // organisation filtering handled by RLS
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return groupEvidenceByTask(data || []);
}

/**
 * Helper to group evidence records by task/subtask
 */
async function groupEvidenceByTask(data: any[]): Promise<Evidence[]> {
  const groupedMap = new Map<string, any>();
  
  for (const item of data) {
    const groupId = item.pair_task_id || item.pair_subtask_id || item.meeting_id || `no-context-${item.id}`;
    if (!groupedMap.has(groupId)) {
      groupedMap.set(groupId, { ...JSON.parse(JSON.stringify(item)), all_files: [] });
    }
    if (item.file_url) {
      const group = groupedMap.get(groupId)!;
      group.all_files.push(JSON.parse(JSON.stringify(item)));
    }
  }

  const finalData = Array.from(groupedMap.values());
  await Promise.all(finalData.map(async (group) => {
    if (group.file_url) group.file_url = await getEvidenceUrl(group.file_url);
    if (group.all_files && group.all_files.length > 0) {
      await Promise.all(group.all_files.map(async (file: any) => {
        if (file.file_url && !file.file_url.startsWith('http')) {
          file.file_url = await getEvidenceUrl(file.file_url);
        }
      }));
    }
  }));

  return finalData;
}

/**
 * Fetch evidence for a specific pair
 */
export async function fetchPairEvidence(pairId: string, taskId?: string): Promise<Evidence[]> {
  let query = supabase
    .from('mp_evidence_uploads')
    .select(`
      *,
      task:mp_pair_tasks!pair_task_id(id, name, evidence_notes, rejection_reason),
      subtask:mp_pair_subtasks!pair_subtask_id(id, name)
    `)
    .eq('pair_id', pairId);

  if (taskId) query = query.eq('pair_task_id', taskId);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;

  const enrichedData = await Promise.all((data || []).map(async item => ({
    ...item,
    file_url: await getEvidenceUrl(item.file_url)
  })));

  return enrichedData;
}

/**
 * Delete evidence record
 */
export async function deleteEvidence(evidenceId: string): Promise<void> {
  const { data: evidence, error: fetchError } = await supabase
    .from('mp_evidence_uploads')
    .select('file_url')
    .eq('id', evidenceId)
    .single();

  if (fetchError) throw fetchError;

  if (evidence?.file_url) {
    await supabase.storage.from('mp-evidence-photos').remove([evidence.file_url]);
  }

  const { error: deleteError } = await supabase.from('mp_evidence_uploads').delete().eq('id', evidenceId);
  if (deleteError) throw deleteError;
}

/**
 * Create new evidence - Partner Pulse alert
 */
export async function createEvidence(input: CreateEvidenceInput): Promise<Evidence> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // 1. Fetch pair details to get organisation and program context
  const { data: pair, error: pairError } = await supabase
    .from('mp_pairs')
    .select('organisation_id, program_id, mentor_id, mentee_id, mentor:mentor_id(full_name), mentee:mentee_id(full_name)')
    .eq('id', input.pair_id)
    .single();

  if (pairError || !pair) {
    throw new Error('Could not verify pairing context for evidence creation.');
  }

  // 2. Insert the evidence with full isolation context
  const { data, error } = await supabase
    .from('mp_evidence_uploads')
    .insert({
      pair_id: input.pair_id,
      pair_task_id: input.pair_task_id,
      pair_subtask_id: input.pair_subtask_id,
      organisation_id: pair.organisation_id,
      program_id: pair.program_id,
      evidence_type_id: input.evidence_type_id,
      file_url: input.file_url,
      file_name: input.file_name,
      mime_type: input.mime_type,
      file_size: input.file_size,
      description: input.description,
      submitted_by: user.id,
      type: input.file_url ? (input.mime_type?.startsWith('image/') ? 'photo' : 'file') : 'text',
      status: input.status || 'pending',
    })
    .select(`
      *,
      task:mp_pair_tasks!pair_task_id(id, name)
    `)
    .single();

  if (error) throw error;

  // Pulse notification to partner
  const enrichedPair = pair as any;
  if (enrichedPair) {
    const isMentor = user.id === enrichedPair.mentor_id;
    const recipientId = isMentor ? enrichedPair.mentee_id : enrichedPair.mentor_id;
    const submitterName = isMentor ? enrichedPair.mentor?.full_name : enrichedPair.mentee?.full_name;
    
    await NotificationService.notifyEvidencePulse(
      data.id, 
      data.task?.name || 'an item', 
      submitterName || 'Partner', 
      recipientId,
      user.id,
      pair.organisation_id
    );
  }

  return {
    ...data,
    pair: pair as any,
    file_url: await getEvidenceUrl(data.file_url)
  };
}

/**
 * Review evidence (supervisor only) - Consolidated Alert
 */
export async function reviewEvidence(
  evidenceId: string,
  input: ReviewEvidenceInput
): Promise<Evidence> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // 1. First, get the evidence to find the pair_task_id
  const { data: currentEvidence } = await supabase
    .from('mp_evidence_uploads')
    .select('pair_task_id, organisation_id')
    .eq('id', evidenceId)
    .single();

  const updateData: any = {
    status: input.status,
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
  };

  // 2. Update the specific evidence OR all evidence for this task
  let updateQuery = supabase.from('mp_evidence_uploads').update(updateData);
  
  if (currentEvidence?.pair_task_id) {
    updateQuery = updateQuery
      .eq('pair_task_id', currentEvidence.pair_task_id)
      .in('status', ['pending', 'rejected']);
  } else {
    updateQuery = updateQuery.eq('id', evidenceId);
  }

  const { data: updatedRecords, error: updateError } = await updateQuery.select(`
    *,
    task:mp_pair_tasks!pair_task_id(id, name, evidence_notes, rejection_reason),
    subtask:mp_pair_subtasks!pair_subtask_id(id, name),
    pair:mp_pairs(id, organisation_id, mentor_id, mentee_id, mentor:mentor_id(full_name), mentee:mentee_id(full_name))
  `);

  if (updateError) throw updateError;
  const data = updatedRecords[0];

  if (data.pair_task_id) {
    try {
      if (input.status === 'approved') {
        await supabase
          .from('mp_pair_tasks')
          .update({ rejection_reason: null })
          .eq('id', data.pair_task_id);
          
        await updatePairTaskStatus(data.pair_task_id, 'completed', user.id);
      } else {
        await supabase
          .from('mp_pair_tasks')
          .update({ 
            status: 'revision_required',
            rejection_reason: input.rejection_reason || 'Changes requested by supervisor.',
            last_feedback: input.rejection_reason || 'Changes requested by supervisor.'
          })
          .eq('id', data.pair_task_id);
      }
    } catch (updateError) {
      console.error(`Error updating task status:`, updateError);
    }
  }

  // 3. Consolidated Notification
  const pair = data.pair as any;
  if (pair) {
    const isMentorSubmitter = data.submitted_by === pair.mentor_id;
    const partnerId = isMentorSubmitter ? pair.mentee_id : pair.mentor_id;
    
    await NotificationService.notifyTaskReviewed(
      data.pair_task_id || data.id,
      data.task?.name || 'Evidence',
      input.status,
      input.rejection_reason || null,
      data.submitted_by,
      partnerId,
      pair.mentor?.full_name || 'Mentor',
      pair.mentee?.full_name || 'Mentee',
      isMentorSubmitter,
      user.id,
      pair.organisation_id
    );
  }

  return { ...data, file_url: await getEvidenceUrl(data.file_url) };
}

/**
 * Upload evidence file to storage
 */
export async function uploadEvidenceFile(file: File, pairId: string): Promise<string> {
  const name = `${Date.now()}-${file.name}`;
  const path = await uploadFile(file, {
    bucket: 'mp-evidence-photos',
    folder: pairId,
    fileName: name,
    compressionPreset: 'EVIDENCE'
  });
  
  // uploadFile returns just the name, but our evidence system expects the path
  return `${pairId}/${path}`;
}

/**
 * Get evidence statistics
 */
export async function fetchEvidenceStats(programId?: string, organisationId?: string) {
  let query = supabase.from('mp_evidence_uploads').select('status, pair:mp_pairs!inner(program_id)');
  
  if (programId && typeof programId === 'string' && programId !== '[object Object]') {
    query = query.eq('pair.program_id', programId);
  } else if (organisationId) {
    // organisation filtering handled by RLS
  }
  const { data, error } = await query;
  if (error) throw error;
  return {
    total: data.length,
    pending: data.filter(e => e.status === 'pending').length,
    approved: data.filter(e => e.status === 'approved').length,
    rejected: data.filter(e => e.status === 'rejected').length,
  };
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
