import { 
  EVIDENCE_STATUS, 
  EvidenceStatus, 
  TASK_STATUS 
} from '@/config/constants';
import { supabase } from '@/lib/supabase';
import { updatePairTaskStatus } from './tasks';
import { NotificationService } from './notifications-service';
import { uploadFile } from './storage';
import { logError } from '@/lib/logger';

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
  status: EvidenceStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  task?: { 
    id: string; 
    name: string; 
    status: string;
    evidence_notes: string | null; 
    rejection_reason: string | null;
    submitted_at: string | null;
    submitted_by_id: string | null;
    last_reviewed_at: string | null;
    last_reviewed_by_id: string | null;
    last_action: string | null;
  };
  subtask?: { id: string; name: string };
  submitter?: { id: string; full_name: string | null };
  reviewer?: { id: string; full_name: string | null };
  pair?: {
    id: string;
    mentor?: { id: string; full_name: string | null; job_title_id: string | null; job_title_name?: string | null; avatar_url?: string | null };
    mentee?: { id: string; full_name: string | null; job_title_id: string | null; job_title_name?: string | null; avatar_url?: string | null };
  };
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
  status?: EvidenceStatus;
}

export interface ReviewEvidenceInput {
  status: typeof EVIDENCE_STATUS.APPROVED | typeof EVIDENCE_STATUS.REJECTED;
  rejection_reason?: string;
}

/**
 * Helper to map database response to Evidence interface
 */
function mapEvidence(e: any): Evidence {
  const mapPair = (pair: any) => {
    if (!pair) return undefined;
    return {
      ...pair,
      mentor: pair.mentor ? {
        ...pair.mentor,
        job_title_name: pair.mentor.job_title?.title || 'No Job Title'
      } : undefined,
      mentee: pair.mentee ? {
        ...pair.mentee,
        job_title_name: pair.mentee.job_title?.title || 'No Job Title'
      } : undefined
    };
  };

  return {
    ...e,
    pair: mapPair(e.pair),
    task: Array.isArray(e.task) ? e.task[0] : e.task,
    subtask: Array.isArray(e.subtask) ? e.subtask[0] : e.subtask,
    submitter: Array.isArray(e.submitter) ? e.submitter[0] : e.submitter,
    reviewer: Array.isArray(e.reviewer) ? e.reviewer[0] : e.reviewer
  };
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
      
    if (error) throw error;
    return data.signedUrl;
  } catch (error: any) {
    await logError({
      message: 'Error getting evidence signed URL',
      componentName: 'evidence-api',
      metadata: { error, path }
    });
    return '';
  }
}

/**
 * Fetch all evidence (supervisor only)
 */
export async function fetchAllEvidence(programId?: string): Promise<Evidence[]> {
  try {
    let query = supabase
      .from('mp_evidence_uploads')
      .select(`
        *,
        task:mp_pair_tasks(id, name, status, evidence_notes, rejection_reason, submitted_at, submitted_by_id, last_reviewed_at, last_reviewed_by_id, last_action),
        subtask:mp_pair_subtasks(id, name),
        pair:mp_pairs!inner(
          id,
          program_id,
          mentor:mentor_id(id, full_name, avatar_url, job_title_id, job_title:mp_job_titles(title)),
          mentee:mentee_id(id, full_name, avatar_url, job_title_id, job_title:mp_job_titles(title))
        ),
        submitter:mp_profiles!submitted_by(id, full_name),
        reviewer:mp_profiles!reviewed_by(id, full_name)
      `);

    if (programId && typeof programId === 'string' && programId !== '[object Object]') {
      query = query.eq('pair.program_id', programId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return await groupEvidenceByTask((data || []).map(mapEvidence));
  } catch (error: any) {
    await logError({
      message: 'Error fetching all evidence',
      componentName: 'evidence-api',
      metadata: { error, programId }
    });
    throw error;
  }
}

/**
 * Fetch pending and rejected evidence (supervisor only)
 */
export async function fetchPendingEvidence(programId?: string): Promise<Evidence[]> {
  try {
    let query = supabase
      .from('mp_evidence_uploads')
      .select(`
        *,
        task:mp_pair_tasks(id, name, status, evidence_notes, rejection_reason, submitted_at, submitted_by_id, last_reviewed_at, last_reviewed_by_id, last_action),
        subtask:mp_pair_subtasks(id, name),
        pair:mp_pairs!inner(
          id,
          program_id,
          mentor:mentor_id(id, full_name, avatar_url, job_title_id, job_title:mp_job_titles(title)),
          mentee:mentee_id(id, full_name, avatar_url, job_title_id, job_title:mp_job_titles(title))
        ),
        submitter:mp_profiles!submitted_by(id, full_name),
        reviewer:mp_profiles!reviewed_by(id, full_name)
      `)
      .in('status', [EVIDENCE_STATUS.PENDING, EVIDENCE_STATUS.REJECTED]);

    if (programId && typeof programId === 'string' && programId !== '[object Object]') {
      query = query.eq('pair.program_id', programId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return await groupEvidenceByTask((data || []).map(mapEvidence));
  } catch (error: any) {
    await logError({
      message: 'Error fetching pending evidence',
      componentName: 'evidence-api',
      metadata: { error, programId }
    });
    throw error;
  }
}

/**
 * Helper to group evidence records by task/subtask
 */
async function groupEvidenceByTask(data: any[]): Promise<Evidence[]> {
  try {
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
  } catch (error: any) {
    await logError({
      message: 'Error grouping evidence by task',
      componentName: 'evidence-api',
      metadata: { error }
    });
    throw error;
  }
}

/**
 * Fetch evidence for a specific pair
 */
export async function fetchPairEvidence(pairId: string, taskId?: string): Promise<Evidence[]> {
  try {
    let query = supabase
      .from('mp_evidence_uploads')
      .select(`
        *,
        task:mp_pair_tasks(id, name, evidence_notes, rejection_reason),
        subtask:mp_pair_subtasks(id, name)
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
  } catch (error: any) {
    await logError({
      message: 'Error fetching pair evidence',
      componentName: 'evidence-api',
      metadata: { error, pairId, taskId }
    });
    throw error;
  }
}

/**
 * Delete evidence record
 */
export async function deleteEvidence(evidenceId: string): Promise<void> {
  try {
    const { data: evidence, error: fetchError } = await supabase
      .from('mp_evidence_uploads')
      .select('file_url')
      .eq('id', evidenceId)
      .single();

    if (fetchError) throw fetchError;

    if (evidence?.file_url) {
      const { error: storageError } = await supabase.storage.from('mp-evidence-photos').remove([evidence.file_url]);
      if (storageError) throw storageError;
    }

    const { error: deleteError } = await supabase.from('mp_evidence_uploads').delete().eq('id', evidenceId);
    if (deleteError) throw deleteError;
  } catch (error: any) {
    await logError({
      message: 'Error deleting evidence',
      componentName: 'evidence-api',
      metadata: { error, evidenceId }
    });
    throw error;
  }
}

/**
 * Create new evidence - Partner Pulse alert
 */
export async function createEvidence(input: CreateEvidenceInput): Promise<Evidence> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // 1. Fetch pair details to get program context
    const { data: pair, error: pairError } = await supabase
      .from('mp_pairs')
      .select('program_id, mentor_id, mentee_id, mentor:mentor_id(full_name), mentee:mentee_id(full_name)')
      .eq('id', input.pair_id)
      .single();

    if (pairError || !pair) {
      throw new Error('Could not verify pairing context for evidence creation.');
    }

    // 2. Insert the evidence with full isolation context
    const { data: rawData, error } = await supabase
      .from('mp_evidence_uploads')
      .insert({
        pair_id: input.pair_id,
        pair_task_id: input.pair_task_id,
        pair_subtask_id: input.pair_subtask_id,
        program_id: pair.program_id,
        evidence_type_id: input.evidence_type_id,
        file_url: input.file_url,
        file_name: input.file_name,
        mime_type: input.mime_type,
        file_size: input.file_size,
        description: input.description,
        submitted_by: user.id,
        type: input.file_url ? (input.mime_type?.startsWith('image/') ? 'photo' : 'file') : 'text',
        status: input.status || EVIDENCE_STATUS.PENDING,
      })
      .select(`
        *,
        task:mp_pair_tasks(id, name),
        submitter:mp_profiles!submitted_by(id, full_name)
      `)
      .single();

    if (error) throw error;

    const data = mapEvidence(rawData);

    return {
      ...data,
      pair: pair as any,
      file_url: await getEvidenceUrl(data.file_url)
    };
  } catch (error: any) {
    await logError({
      message: 'Error creating evidence',
      componentName: 'evidence-api',
      metadata: { error, input }
    });
    throw error;
  }
}

/**
 * Review evidence (supervisor only) - Consolidated Alert
 */
export async function reviewEvidence(
  evidenceId: string,
  input: ReviewEvidenceInput
): Promise<Evidence> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // 1. First, get the evidence to find the pair_task_id
    const { data: currentEvidence, error: fetchError } = await supabase
      .from('mp_evidence_uploads')
      .select('pair_task_id')
      .eq('id', evidenceId)
      .single();

    if (fetchError) throw fetchError;

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
        .in('status', [EVIDENCE_STATUS.PENDING, EVIDENCE_STATUS.REJECTED]);
    } else {
      updateQuery = updateQuery.eq('id', evidenceId);
    }

    const { data: updatedRecords, error: updateError } = await updateQuery.select(`
      *,
      task:mp_pair_tasks(id, name, evidence_notes, rejection_reason),
      subtask:mp_pair_subtasks(id, name),
      pair:mp_pairs(id, mentor_id, mentee_id, mentor:mentor_id(full_name), mentee:mentee_id(full_name)),
      submitter:mp_profiles!submitted_by(id, full_name),
      reviewer:mp_profiles!reviewed_by(id, full_name)
    `);

    if (updateError) throw updateError;
    const data = mapEvidence(updatedRecords[0]);
    if (data.pair_task_id) {
      try {
        if (input.status === EVIDENCE_STATUS.APPROVED) {
          const { error: taskUpdateError } = await supabase
            .from('mp_pair_tasks')
            .update({ rejection_reason: null })
            .eq('id', data.pair_task_id);
          
          if (taskUpdateError) throw taskUpdateError;
            
          await updatePairTaskStatus(data.pair_task_id, TASK_STATUS.COMPLETED, user.id);
        } else {
          await updatePairTaskStatus(
            data.pair_task_id, 
            TASK_STATUS.REVISION_REQUIRED, 
            user.id, 
            input.rejection_reason || 'Changes requested by supervisor.'
          );

          // Also update rejection_reason explicitly if needed (though updatePairTaskStatus might handle it via evidenceNotes)
          const { error: taskUpdateError } = await supabase
            .from('mp_pair_tasks')
            .update({ 
              rejection_reason: input.rejection_reason || 'Changes requested by supervisor.',
              last_feedback: input.rejection_reason || 'Changes requested by supervisor.'
            })
            .eq('id', data.pair_task_id);

          if (taskUpdateError) throw taskUpdateError;
        }
      } catch (updateError: any) {
        await logError({
          message: 'Error updating task status during evidence review',
          componentName: 'evidence-api',
          metadata: { error: updateError, taskId: data.pair_task_id, status: input.status }
        });
        // We continue because the evidence itself was updated successfully
      }
    }

    // 3. Consolidated Notification
    const pair = data.pair as any;
    if (pair) {
      try {
        const isMentorSubmitter = data.submitted_by === pair.mentor_id;
        const partnerId = isMentorSubmitter ? pair.mentee_id : pair.mentor_id;
        
        await NotificationService.notifyTaskReviewed({
          taskId: data.pair_task_id || data.id,
          taskName: data.task?.name || 'Evidence',
          pairId: pair.id, // Added pairId
          status: input.status,
          feedback: input.rejection_reason || null,
          submitterId: data.submitted_by,
          partnerId,
          partnerName: isMentorSubmitter ? (pair.mentor?.full_name || 'Mentor') : (pair.mentee?.full_name || 'Mentee'),
          actorId: user.id
        });
      } catch (notifError: any) {
        await logError({
          message: 'Error sending notification during evidence review',
          componentName: 'evidence-api',
          metadata: { error: notifError, evidenceId }
        });
      }
    }

    return { ...data, file_url: await getEvidenceUrl(data.file_url) };
  } catch (error: any) {
    await logError({
      message: 'Error reviewing evidence',
      componentName: 'evidence-api',
      metadata: { error, evidenceId, input }
    });
    throw error;
  }
}

/**
 * Upload evidence file to storage
 */
export async function uploadEvidenceFile(file: File, pairId: string): Promise<string> {
  try {
    const name = `${Date.now()}-${file.name}`;
    const path = await uploadFile(file, {
      bucket: 'mp-evidence-photos',
      folder: pairId,
      fileName: name,
      compressionPreset: 'EVIDENCE'
    });
    
    return `${pairId}/${path}`;
  } catch (error: any) {
    await logError({
      message: 'Error uploading evidence file',
      componentName: 'evidence-api',
      metadata: { error, pairId, fileName: file.name }
    });
    throw error;
  }
}

/**
 * Get evidence statistics
 */
export async function fetchEvidenceStats(programId?: string) {
  try {
    let query = supabase.from('mp_evidence_uploads').select('status, pair:mp_pairs!inner(program_id)');
    
    if (programId && typeof programId === 'string' && programId !== '[object Object]') {
      query = query.eq('pair.program_id', programId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return {
      total: data.length,
      pending: data.filter(e => e.status === EVIDENCE_STATUS.PENDING).length,
      approved: data.filter(e => e.status === EVIDENCE_STATUS.APPROVED).length,
      rejected: data.filter(e => e.status === EVIDENCE_STATUS.REJECTED).length,
    };
  } catch (error: any) {
    await logError({
      message: 'Error fetching evidence stats',
      componentName: 'evidence-api',
      metadata: { error, programId }
    });
    throw error;
  }
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
