import { supabase } from '@/lib/supabase';
import { createNotification } from './notifications';

/**
 * NotificationService
 * 
 * Centralised logic for application-side notifications.
 * This replaces database triggers with testable TypeScript code.
 * 
 * CORE RULE: No user should ever receive a notification for an action they performed.
 */
export const NotificationService = {
  
  /**
   * Helper to fetch all supervisors for a specific organisation
   */
  async getSupervisors(organisationId?: string) {
    let query = supabase
      .from('mp_memberships')
      .select('user_id')
      .in('role', ['org-admin', 'supervisor'])
      .eq('status', 'active');
    
    if (organisationId) {
      query = query.eq('organisation_id', organisationId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching supervisors for notification:', error);
      return [];
    }
    // Map user_id to id to maintain compatibility with calling methods
    return data?.map(m => ({ id: m.user_id })) || [];
  },

  /**
   * Notify when a task is submitted for review
   * Notifies ALL supervisors (excluding actor) AND the pair buddy
   */
  async notifyTaskSubmitted(
    taskName: string, 
    pairId: string, 
    mentorId: string, 
    menteeId: string,
    mentorName: string, 
    menteeName: string,
    actorId: string,
    actorName: string,
    organisationId?: string
  ) {
    const supervisors = await this.getSupervisors(organisationId);
    
    // 1. Notify Supervisors (Action Required)
    const supervisorPromises = supervisors
      .filter(s => s.id !== actorId)
      .map(s => 
        createNotification(
          s.id,
          'task_submitted',
          'Task Awaiting Review',
          `${actorName} submitted "${taskName}" for your review (Pair: ${mentorName} & ${menteeName}).`,
          `/supervisor/evidence-review?pairId=${pairId}`,
          pairId,
          organisationId
        )
      );

    // 2. Notify the Pair Buddy (Informational)
    const buddyId = actorId === mentorId ? menteeId : mentorId;
    
    let buddyPromise = Promise.resolve(null);
    if (buddyId !== actorId) {
      buddyPromise = createNotification(
        buddyId,
        'task_submitted',
        'Task Submitted for Review',
        `${actorName} has submitted ${taskName} for Supervisor review.`,
        `/program-member/tasks?taskId=${pairId}`,
        pairId,
        organisationId
      );
    }
    
    await Promise.all([...supervisorPromises, buddyPromise]);
  },

  /**
   * Notify pair members when evidence is reviewed
   */
  async notifyTaskReviewed(
    taskId: string, 
    taskName: string, 
    status: 'approved' | 'rejected', 
    feedback: string | null,
    submitterId: string,
    partnerId: string,
    mentorName: string,
    menteeName: string,
    isMentorSubmitter: boolean,
    actorId: string, // The Supervisor reviewing it
    organisationId?: string
  ) {
    const statusLabel = status === 'approved' ? 'Approved' : 'Revision Requested';
    const type = status === 'approved' ? 'evidence_approved' : 'evidence_rejected';
    
    // 1. Notify Submitter (if not the one who reviewed it, which is always true here)
    const submitterPromise = submitterId !== actorId 
      ? createNotification(
          submitterId,
          type,
          `Evidence ${statusLabel}`,
          status === 'approved' 
            ? `Your evidence for ${taskName} has been approved by the Supervisor.`
            : `Revision requested on ${taskName}. Feedback: ${feedback || 'Check details.'}`,
          `/program-member/tasks?taskId=${taskId}`,
          taskId,
          organisationId
        )
      : Promise.resolve(null);

    // 2. Notify Partner
    const partnerName = isMentorSubmitter ? mentorName : menteeName;
    const partnerPromise = partnerId !== actorId
      ? createNotification(
          partnerId,
          type,
          `Pair Progress: Evidence ${statusLabel}`,
          status === 'approved'
            ? `The Supervisor approved the evidence uploaded by ${partnerName}.`
            : `Revision requested on evidence by ${partnerName}. Feedback: ${feedback || 'Check details.'}`,
          `/program-member/tasks?taskId=${taskId}`,
          taskId,
          organisationId
        )
      : Promise.resolve(null);

    await Promise.all([submitterPromise, partnerPromise]);
  },

  /**
   * Notify when a meeting is created or updated
   */
  async notifyMeetingChange(
    meetingId: string,
    title: string,
    dateTime: string,
    mentorId: string,
    menteeId: string,
    actorId: string,
    isNew: boolean,
    organisationId?: string
  ) {
    const type = isNew ? 'meeting_created' : 'meeting_updated';
    const titleLabel = isNew ? 'New Meeting Scheduled' : 'Meeting Details Updated';
    const formattedDate = new Date(dateTime).toLocaleString('en-GB', { 
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    });

    const description = `Meeting: ${title} on ${formattedDate}`;
    const actionUrl = `/program-member/meetings?id=${meetingId}`;

    // STRICT FILTER: No self-notification
    const recipients = [mentorId, menteeId].filter(id => id !== actorId);

    const promises = recipients.map(id => 
      createNotification(id, type, titleLabel, description, actionUrl, meetingId, organisationId)
    );

    await Promise.all(promises);
  },

  /**
   * Notify when a meeting is cancelled (deleted)
   */
  async notifyMeetingCancelled(
    title: string,
    dateTime: string,
    mentorId: string,
    menteeId: string,
    actorId: string,
    organisationId?: string
  ) {
    const formattedDate = new Date(dateTime).toLocaleString('en-GB', { 
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    });

    const description = `Meeting cancelled: ${title} which was scheduled for ${formattedDate}`;
    
    // STRICT FILTER: No self-notification
    const recipients = [mentorId, menteeId].filter(id => id !== actorId);

    const promises = recipients.map(id => 
      createNotification(id, 'meeting_updated', 'Meeting Cancelled', description, '/program-member/meetings', null, organisationId)
    );

    await Promise.all(promises);
  },

  /**
   * Notify when a task is re-opened by a pair member
   * Notifies ALL supervisors
   */
  async notifyTaskReopened(
    taskName: string, 
    pairId: string, 
    mentorName: string, 
    menteeName: string,
    actorId: string,
    actorName: string,
    organisationId?: string
  ) {
    const supervisors = await this.getSupervisors(organisationId);
    
    const promises = supervisors
      .filter(s => s.id !== actorId)
      .map(s => 
        createNotification(
          s.id,
          'note_added',
          'Task Re-opened',
          `${actorName} has re-opened "${taskName}" for the pair ${mentorName} & ${menteeName}.`,
          `/supervisor/checklist?pair=${pairId}`,
          pairId,
          organisationId
        )
      );
    
    await Promise.all(promises);
  },

  /**
   * Notify when a supervisor adds a task to an existing pair
   */
  async notifyTaskAdded(taskId: string, taskName: string, mentorId: string, menteeId: string, actorId: string, organisationId?: string) {
    const title = 'New Task Assigned';
    const mentorDesc = `The Supervisor has added a new task to your pairing: ${taskName}`;
    const menteeDesc = `A new task has been added to your checklist: ${taskName}`;
    const actionUrl = `/program-member/tasks?taskId=${taskId}`;

    const recipients = [];
    if (mentorId !== actorId) recipients.push(createNotification(mentorId, 'task_completed', title, mentorDesc, actionUrl, taskId, organisationId));
    if (menteeId !== actorId) recipients.push(createNotification(menteeId, 'task_completed', title, menteeDesc, actionUrl, taskId, organisationId));

    await Promise.all(recipients);
  },

  /**
   * Notify partner when an individual evidence file is uploaded (Pulse)
   */
  async notifyEvidencePulse(evidenceId: string, taskName: string, submitterName: string, recipientId: string, actorId: string, organisationId?: string) {
    // STRICT FILTER: No self-notification
    if (recipientId === actorId) return;

    await createNotification(
      recipientId,
      'evidence_uploaded',
      'Partner Shared Evidence',
      `${submitterName} shared evidence for: ${taskName}`,
      `/program-member/tasks?id=${evidenceId}`,
      evidenceId,
      organisationId
    );
  },

  /**
   * Notify supervisor of pair milestones
   */
  async notifyMilestone(
    type: 'milestone_50' | 'pair_completed', 
    pairId: string, 
    mentorName: string, 
    menteeName: string, 
    actorId: string,
    actorName: string,
    organisationId?: string
  ) {
    const supervisors = await this.getSupervisors(organisationId);
    
    const title = type === 'pair_completed' ? 'Program Checklist Completed' : '50% Milestone Reached';
    const description = type === 'pair_completed'
      ? `${actorName} completed the final task for the pair ${mentorName} & ${menteeName}.`
      : `${actorName} reached the 50% milestone for the pair ${mentorName} & ${menteeName}.`;

    // STRICT FILTER: No self-notification for supervisors
    const promises = supervisors
      .filter(s => s.id !== actorId)
      .map(s => 
        createNotification(s.id, type, title, description, `/supervisor/pairs?pairId=${pairId}`, pairId, organisationId)
      );

    await Promise.all(promises);
  },

  /**
   * Notify supervisor when a profile is completed
   */
  async notifyProfileCompleted(profileId: string, fullName: string, actorId: string, organisationId?: string) {
    const supervisors = await this.getSupervisors(organisationId);
    
    // STRICT FILTER: No self-notification
    const promises = supervisors
      .filter(s => s.id !== actorId)
      .map(s => 
        createNotification(
          s.id,
          'profile_completed',
          'New Participant Onboarded',
          `${fullName} has completed their initial profile setup.`,
          `/org-admin/participants?id=${profileId}`,
          profileId,
          organisationId
        )
      );

    await Promise.all(promises);
  }
};
