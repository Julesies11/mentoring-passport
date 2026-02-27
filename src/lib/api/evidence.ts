import { supabase } from '@/lib/supabase';
import { createNotification } from '@/lib/api/notifications';

export interface Evidence {
  id: string;
  pair_id: string;
  master_task_id: string | null;
  sub_task_id: string | null;
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
  subtask?: {
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
  master_task_id?: string;
  sub_task_id?: string;
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
    .from('mp_evidence_uploads')
    .select(`
      *,
      task:mp_tasks_master!master_task_id(id, name),
      subtask:mp_pair_subtasks!sub_task_id(id, name),
      pair:mp_pairs(
        id,
        mentor:mentor_id(id, full_name),
        mentee:mentee_id(id, full_name)
      ),
      reviewer:reviewed_by(id, full_name)
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
    .from('mp_evidence_uploads')
    .select(`
      *,
      task:mp_tasks_master!master_task_id(id, name),
      subtask:mp_pair_subtasks!sub_task_id(id, name),
      evidence_type:mp_evidence_types(id, name),
      reviewer:reviewed_by(id, full_name)
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
    .from('mp_evidence_uploads')
    .select(`
      *,
      task:mp_tasks_master!master_task_id(id, name),
      subtask:mp_pair_subtasks!sub_task_id(id, name),
      pair:mp_pairs(
        id,
        mentor:mentor_id(id, full_name),
        mentee:mentee_id(id, full_name)
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  const userId = user.id;

  const { data, error } = await supabase
    .from('mp_evidence_uploads')
    .insert({
      pair_id: input.pair_id,
      master_task_id: input.master_task_id,
      sub_task_id: input.sub_task_id,
      evidence_type_id: input.evidence_type_id,
      file_url: input.file_url,
      description: input.description,
      submitted_by: userId,
      type: 'photo', // Default type
      status: 'pending',
    })
    .select(`
      *,
      task:mp_tasks_master!master_task_id(id, name),
      subtask:mp_pair_subtasks!sub_task_id(id, name),
      evidence_type:mp_evidence_types(id, name)
    `)
    .single();

  if (error) {
    console.error('Error creating evidence:', error);
    throw error;
  }

  // Create notifications after evidence is successfully uploaded
  try {
    // Get pair information for notifications
    const { data: pairData } = await supabase
      .from('mp_pairs')
      .select('mentor_id, mentee_id')
      .eq('id', input.pair_id)
      .single();

    if (pairData) {
      // Get submitter name
      const { data: submitterData } = await supabase
        .from('mp_profiles')
        .select('full_name')
        .eq('id', userId)
        .single();

      const submitterName = submitterData?.full_name || 'Unknown User';
      const taskName = data.task?.name || data.subtask?.name || 'Task';

      // Notify mentor if mentee submitted, or vice versa
      const recipientId = userId === pairData.mentor_id ? pairData.mentee_id : pairData.mentor_id;
      if (recipientId) {
        await createNotification(
          recipientId,
          'evidence_uploaded',
          'New Evidence Uploaded',
          `${submitterName} uploaded evidence for: ${taskName}`,
          userId === pairData.mentor_id ? '/mentee/evidence' : '/mentor/evidence',
          data.id
        );
      }

      // Notify supervisor
      const { data: supervisorData } = await supabase
        .from('mp_profiles')
        .select('id')
        .eq('role', 'supervisor')
        .limit(1);

      if (supervisorData) {
        await createNotification(
          supervisorData.id,
          'evidence_uploaded',
          'Evidence Awaiting Review',
          `${submitterName} uploaded evidence for: ${taskName}`,
          '/supervisor/evidence-review',
          data.id
        );
      }
    }
  } catch (notificationError) {
    // Log notification error but don't fail the evidence upload
    console.error('Error creating notifications:', notificationError);
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
    .from('mp_evidence_uploads')
    .update(updateData)
    .eq('id', evidenceId)
    .select(`
      *,
      task:mp_tasks_master!master_task_id(id, name),
      subtask:mp_pair_subtasks!sub_task_id(id, name),
      evidence_type:mp_evidence_types(id, name),
      reviewer:reviewed_by(id, full_name),
      pair:mp_pairs(id, mentor_id, mentee_id)
    `)
    .single();

  if (error) {
    console.error('Error reviewing evidence:', error);
    throw error;
  }

  // Create notifications after evidence is reviewed
  try {
    // Only notify when status changes to approved or rejected
    if (data.status === 'approved' || data.status === 'rejected') {
      const taskName = data.task?.name || data.subtask?.name || 'Task';
      const submitterId = data.submitted_by;
      
      if (submitterId) {
        // Notify the submitter about the review result
        await createNotification(
          submitterId,
          data.status === 'approved' ? 'evidence_approved' : 'evidence_rejected',
          data.status === 'approved' ? 'Evidence Approved' : 'Evidence Needs Revision',
          data.status === 'approved' 
            ? 'Your evidence has been approved by the supervisor'
            : 'Your evidence needs revision. Please check the feedback.',
          submitterId === data.pair?.mentor_id ? '/mentor/evidence' : '/mentee/evidence',
          data.id
        );
      }
    }
  } catch (notificationError) {
    // Log notification error but don't fail the evidence review
    console.error('Error creating notifications:', notificationError);
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
